// @ts-nocheck
/**
 * ==================================================================================
 * PPID LIFT METHODOLOGY - COMBINED CHANNEL VERSION (No DEMAND_CHANNEL split)
 * ==================================================================================
 */
function buildPPIDLiftReport() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName('Raw Data') || ss.getSheetByName('Sheet1');
    if (!sourceSheet) {
        throw new Error("Rename your data sheet as 'Raw Data'");
    }
    const header = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
    const safeColIndex = (name) => {
        const idx = header.indexOf(name);
        return idx === -1 ? null : idx;
    };

    const DATE_COL = safeColIndex('dt');
    const PPID_STATUS_COL = safeColIndex('PPID_STATUS_NAME');
    const ADX_REV_COL = safeColIndex('adx_revenue');
    const ADS_REV_COL = safeColIndex('ads_revenue');
    const AD_REQUESTS_COL = safeColIndex('ad_requests');
    const ANON_ADX_REQ_COL = safeColIndex('ANON_ADX_TOTAL_REQUESTS');
    const ANON_ADS_IMP_COL = safeColIndex('ANON_ADS_IMPRESSIONS');
    const ANON_ADS_UNFILLED_COL = safeColIndex('ANON_ADS_UNFILLED_IMPRESSIONS');
    const PPID_PASS_RATE_COL = safeColIndex('ppid_passing_rate');

    if (DATE_COL === null || PPID_STATUS_COL === null) {
        const outputSheet = ss.getSheetByName('Error Log') || ss.insertSheet('Error Log');
        outputSheet.clear().getRange(1, 1).setValue('ERROR: Missing required columns.');
        return;
    }

    const lastRow = sourceSheet.getLastRow();
    const lastCol = sourceSheet.getLastColumn();
    const CHUNK_SIZE = 2000;

    // Combined treatment and control maps: date -> { revenue, adRequests }
    const treatmentData = {};
    const controlData = {};
    // Anonymous baseline: date -> { anonBase, passRate }
    const anonData = {};

    const ensureDateKey = (v) =>
        v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v);

    const addToMap = (map, date, rev, reqs) => {
        if (!map[date]) map[date] = { revenue: 0, adRequests: 0 };
        map[date].revenue += Number(rev) || 0;
        map[date].adRequests += Number(reqs) || 0;
    };

    // Normalises PPID status strings to Title Case equivalents.
    // Handles both 'ACTIVE' and 'Active' → 'Active', 'MISSING' → 'Missing', etc.
    const norm = (v) => {
        const x = String(v || '').toLowerCase().trim();
        if (x === 'active') return 'Active';
        if (x === 'missing') return 'Missing';
        if (x === 'restricted') return 'Restricted';
        return x;
    };

    for (let start = 2; start <= lastRow; start += CHUNK_SIZE) {
        const rows = sourceSheet
            .getRange(start, 1, Math.min(CHUNK_SIZE, lastRow - start + 1), lastCol)
            .getValues();

        rows.forEach(r => {
            const ppidStatus = norm(r[PPID_STATUS_COL]);
            const date = ensureDateKey(r[DATE_COL]);

            // Combined revenue = adx_revenue + ads_revenue
            const rev = (Number(r[ADX_REV_COL]) || 0) + (Number(r[ADS_REV_COL]) || 0);
            const reqs = Number(r[AD_REQUESTS_COL]) || 0;

            if (ppidStatus === 'Active') {
                addToMap(treatmentData, date, rev, reqs);

                // Anonymous baseline: sum of ADX requests + ADS impressions + ADS unfilled
                // Overwrite is safe here — passing rate and anon counts come from the Active row
                // and there is only one Active row per date in the new structure
                const anonBase =
                    (Number(r[ANON_ADX_REQ_COL]) || 0) +
                    (Number(r[ANON_ADS_IMP_COL]) || 0) +
                    (Number(r[ANON_ADS_UNFILLED_COL]) || 0);

                anonData[date] = {
                    anonBase: anonBase,
                    passRate: Number(r[PPID_PASS_RATE_COL]) || 0
                };
            }

            if (ppidStatus === 'Missing') {
                addToMap(controlData, date, rev, reqs);
            }
        });
    }

    // Group dates by month and generate one sheet per month
    const monthBuckets = {};
    const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const allDates = new Set([
        ...Object.keys(treatmentData),
        ...Object.keys(controlData),
        ...Object.keys(anonData)
    ]);

    allDates.forEach(dk => {
        const m = dk.substring(0, 7);
        if (!monthBuckets[m]) monthBuckets[m] = new Set();
        monthBuckets[m].add(dk);
    });

    const sortedMonthKeys = Object.keys(monthBuckets).sort();

    // Group months by year so we can build one summary sheet per year
    const yearBuckets = {};
    Object.keys(monthBuckets).forEach(monthKey => {
        const year = monthKey.substring(0, 4);
        if (!yearBuckets[year]) yearBuckets[year] = [];
        yearBuckets[year].push(monthKey);
    });

    sortedMonthKeys.forEach(monthKey => {
        const year = monthKey.substring(0, 4);
        const prefix = MONTH_ABBR[parseInt(monthKey.substring(5, 7)) - 1];

        // Filter treatment / control to this month
        const filter = (map) => {
            const res = {};
            Object.keys(map).forEach(dk => { if (dk.startsWith(monthKey)) res[dk] = map[dk]; });
            return res;
        };
        generateOutput(ss, `${prefix} ${year} - PPID Lift`, filter(treatmentData), filter(controlData), anonData, monthKey);
    });

    Object.keys(yearBuckets).sort().forEach(year => {
        buildSummarySheet(ss, year);
    });

    SpreadsheetApp.flush();
    organiseSheets(ss);
}

// ============================================================
// SHEET ORDERING
// 1. Summary sheets first (most recent year first)
// 2. Monthly sheets in decreasing order (most recent first)
// 3. Raw Data sheet last
// ============================================================
function organiseSheets(ss) {
    const summaryPattern = /^(\d{4})\s+Summary$/;
    const monthlyPattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s*-\s*PPID Lift$/;
    const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const summarySheets = [];
    const monthlySheets = [];
    let rawDataSheet = null;

    ss.getSheets().forEach(sheet => {
        const name = sheet.getName();
        const sm = summaryPattern.exec(name);
        if (sm) {
            summarySheets.push({ key: parseInt(sm[1]), sheet });
            return;
        }
        const mm = monthlyPattern.exec(name);
        if (mm) {
            const monthNum = MONTH_ABBR.indexOf(mm[1]) + 1;
            monthlySheets.push({ key: parseInt(mm[2]) * 100 + monthNum, sheet });
            return;
        }
        if (name === 'Raw Data' || name === 'Sheet1') rawDataSheet = sheet;
    });

    summarySheets.sort((a, b) => b.key - a.key);
    monthlySheets.sort((a, b) => b.key - a.key);

    [...summarySheets, ...monthlySheets].map(x => x.sheet).forEach((sheet, i) => {
        ss.setActiveSheet(sheet);
        ss.moveActiveSheet(i + 1);
    });

    if (rawDataSheet) {
        ss.setActiveSheet(rawDataSheet);
        ss.moveActiveSheet(ss.getSheets().length);
    }
}

// ==================================================================================
// generateOutput — builds a single monthly sheet with combined (ADX+ADS) analysis
// ==================================================================================
function generateOutput(ss, sheetName, treatment, control, anonData, monthKey) {
    let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.clear();

    const year = parseInt(monthKey.substring(0, 4));
    const month = parseInt(monthKey.substring(5, 7)) - 1;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const rows = [];

    for (let d = 1; d <= lastDay; d++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        const t = treatment[dateKey] || { revenue: 0, adRequests: 0 };
        const c = control[dateKey] || { revenue: 0, adRequests: 0 };
        const anon = anonData[dateKey] || { anonBase: 0, passRate: 0 };

        const tEcpm = t.adRequests > 0 ? (t.revenue / t.adRequests) * 1000 : 0;
        const cEcpm = c.adRequests > 0 ? (c.revenue / c.adRequests) * 1000 : 0;

        const ecpmUplift = tEcpm - cEcpm;

        const activeAnonReqs = anon.anonBase * anon.passRate;
        const revUplift = (activeAnonReqs * ecpmUplift) / 1000;
        const revPct = t.revenue !== 0 ? revUplift / t.revenue : 0;

        rows.push([
            dateKey,
            anon.passRate,
            t.revenue, t.adRequests, tEcpm,
            c.revenue, c.adRequests, cEcpm,
            ecpmUplift, revPct,
            activeAnonReqs, revUplift
        ]);
    }

    // ── Headers ──────────────────────────────────────────────────────────────────
    const h1 = ['DATE', 'PPID PASSING RATE', 'COMBINED (ADX + AD SERVER)', '', '', '', '', '', '', '', '', ''];
    const h2 = ['', '', 'TREATMENT GROUP', '', '', 'CONTROL GROUP', '', '', 'UPLIFT', '', '', ''];
    const h3 = ['', '', 'Revenue', 'Ad Requests', 'eCPM', 'Revenue', 'Ad Requests', 'eCPM', 'eCPM Uplift', 'Revenue %', 'Active Anon Req', 'Rev Uplift'];

    sheet.getRange(1, 1, 3, 12).setValues([h1, h2, h3])
        .setFontWeight('bold')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle');

    // Merge header cells
    sheet.getRange(1, 1, 3, 1).merge();
    sheet.getRange(1, 2, 3, 1).merge().setBackground('#fff2cc');
    sheet.getRange(1, 3, 1, 10).merge().setBackground('#5f6368').setFontColor('#ffffff');

    sheet.getRange(2, 3, 1, 3).merge().setBackground('#b6d7a8');  // Treatment
    sheet.getRange(2, 6, 1, 3).merge().setBackground('#ea9999');  // Control
    sheet.getRange(2, 9, 1, 4).merge().setBackground('#9fc5e8');  // Uplift

    // ── Totals row (row 4) ───────────────────────────────────────────────────────
    const totalsRow = 4;
    const dataStart = 5;
    const rangeHeight = rows.length;

    sheet.getRange(dataStart, 1, rows.length, 12).setValues(rows);
    sheet.getRange(totalsRow, 1).setValue('TOTAL').setFontWeight('bold');

    // Sum columns where data exists (keyed on Treatment ad requests col 4)
    [3, 4, 6, 7, 11, 12].forEach(c =>
        sheet.getRange(totalsRow, c).setFormulaR1C1(
            `=SUMIF(R[1]C4:R[${rangeHeight}]C4,">0",R[1]C:R[${rangeHeight}]C)`
        )
    );
    // Average columns (rates, eCPMs) — only over days with data
    [2, 5, 8, 9].forEach(c =>
        sheet.getRange(totalsRow, c).setFormulaR1C1(
            `=AVERAGEIF(R[1]C4:R[${rangeHeight}]C4,">0",R[1]C:R[${rangeHeight}]C)`
        )
    );
    // Revenue %: total Rev Uplift / total Treatment Revenue
    sheet.getRange(totalsRow, 10).setFormula(`=IFERROR(L${totalsRow}/C${totalsRow},0)`);

    sheet.getRange(totalsRow, 1, 1, 12).setFontWeight('bold').setBackground('#f3f3f3');

    // ── Conditional formatting for uplift columns (col 9 = eCPM Uplift, col 12 = Rev Uplift) ──
    // Column-level rules covering the TOTAL row + all data rows.
    const ecpmUpliftRange = sheet.getRange(totalsRow, 9, rows.length + 1, 1);
    const revUpliftRange  = sheet.getRange(totalsRow, 12, rows.length + 1, 1);
    sheet.setConditionalFormatRules([
        SpreadsheetApp.newConditionalFormatRule()
            .whenNumberGreaterThan(0).setBackground('#b6d7a8').setRanges([ecpmUpliftRange]).build(),
        SpreadsheetApp.newConditionalFormatRule()
            .whenNumberLessThan(0).setBackground('#ea9999').setRanges([ecpmUpliftRange]).build(),
        SpreadsheetApp.newConditionalFormatRule()
            .whenNumberGreaterThan(0).setBackground('#b6d7a8').setRanges([revUpliftRange]).build(),
        SpreadsheetApp.newConditionalFormatRule()
            .whenNumberLessThan(0).setBackground('#ea9999').setRanges([revUpliftRange]).build(),
    ]);

    // ── Formatting ───────────────────────────────────────────────────────────────
    sheet.getRange(1, 1, dataStart + rows.length, 12).setWrap(false);
    sheet.setFrozenRows(4);
    sheet.setFrozenColumns(1);

    sheet.autoResizeColumns(1, 12);
    for (let i = 1; i <= 12; i++) sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 25);

    sheet.getRange(4, 1, 1, 12).setBorder(
        null, null, true, null, null, null, 'black', SpreadsheetApp.BorderStyle.SOLID_THICK
    );

    // Number formats (rows 4 onwards to cover totals + data)
    sheet.getRange(4, 2, rows.length + 1, 1).setNumberFormat('0.00%');                      // PPID rate
    [3, 5, 6, 8, 9, 12].forEach(c =>
        sheet.getRange(4, c, rows.length + 1, 1).setNumberFormat('#,##0.00')                // values & eCPMs
    );
    sheet.getRange(4, 10, rows.length + 1, 1).setNumberFormat('0.00%');                      // Revenue %
    [4, 7, 11].forEach(c =>
        sheet.getRange(4, c, rows.length + 1, 1).setNumberFormat('#,##0')                    // Requests
    );

    // ── Revenue uplift summary box ───────────────────────────────────────────────
    const sRow = dataStart + rows.length + 2;
    sheet.getRange(sRow, 4, 2, 2).setValues([
        ['REVENUE UPLIFT', ''],
        ['Total', `=L${totalsRow}`]
    ]);
    sheet.getRange(sRow, 4, 1, 2)
        .merge()
        .setBackground('#000000')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
    sheet.getRange(sRow + 1, 4, 1, 2).setFontWeight('bold');
    sheet.getRange(sRow + 1, 5, 1, 1).setNumberFormat('#,##0.00');

    // Conditional formatting on summary value (column-level rule)
    const summaryValRange = sheet.getRange(sRow + 1, 5, 1, 1);
    const summaryRules = sheet.getConditionalFormatRules();
    summaryRules.push(
        SpreadsheetApp.newConditionalFormatRule()
            .whenNumberGreaterThan(0).setBackground('#b6d7a8').setRanges([summaryValRange]).build(),
        SpreadsheetApp.newConditionalFormatRule()
            .whenNumberLessThan(0).setBackground('#ea9999').setRanges([summaryValRange]).build()
    );
    sheet.setConditionalFormatRules(summaryRules);
}

// ==================================================================================
// buildSummarySheet — 2026 annual summary (single combined uplift per month)
// ==================================================================================
function buildSummarySheet(ss, year) {
    const sheetName = `${year} Summary`;
    let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.clear();
    const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    sheet.getRange(1, 1).setValue(year).setFontWeight('bold');
    sheet.getRange(1, 2).setValue('AD REQUESTS');
    sheet.getRange(1, 3).setValue('REVENUE UPLIFT');
    sheet.getRange(1, 4).setValue('RELATIVE UPLIFT');
    sheet.getRange(1, 2, 1, 3)
        .setBackground('#000000')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setHorizontalAlignment('center');

    for (let m = 0; m < 12; m++) {
        const baseRow = 2 + (m * 2);   // 2 rows per month: header + single data row
        const abbr = MONTH_ABBR[m];
        const sRef = `'${abbr} ${year} - PPID Lift'`;

        // Month label row
        sheet.getRange(baseRow, 1, 1, 4)
            .setBackground('#b6d7a8')
            .setFontWeight('bold');
        sheet.getRange(baseRow, 1).setValue(MONTH_FULL[m]);

        // Pull totals directly from column 4 (Ad Requests), 12 (Rev Uplift), 10 (eCPM % Uplift) of the monthly sheet
        sheet.getRange(baseRow, 2).setFormula(`=IFERROR(${sRef}!D4, 0)`);  // Treatment ad requests total
        sheet.getRange(baseRow, 3).setFormula(`=IFERROR(${sRef}!L4, 0)`);  // Revenue uplift total
        sheet.getRange(baseRow, 4).setFormula(`=IFERROR(${sRef}!J4, 0)`);  // Revenue %

        sheet.getRange(baseRow, 1, 1, 4)
            .setBorder(true, true, true, true, null, null, 'black', SpreadsheetApp.BorderStyle.SOLID);
    }

    sheet.getRange(1, 1, 30, 4).setWrap(false).setVerticalAlignment('middle');
    sheet.autoResizeColumns(1, 4);
    for (let i = 1; i <= 4; i++) sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 30);

    sheet.getRange(2, 2, 24, 1).setNumberFormat('#,##0');
    sheet.getRange(2, 3, 24, 1).setNumberFormat('#,##0.00');
    sheet.getRange(2, 4, 24, 1).setNumberFormat('0.00%');

    sheet.setFrozenRows(1);
}