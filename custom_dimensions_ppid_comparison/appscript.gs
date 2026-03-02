// @ts-nocheck
/**
 * ==================================================================================
 * ANONYMISED SIGNAL LIFT METHODOLOGY
 * ==================================================================================
 *
 * OBJECTIVE:
 * Measure the incremental revenue impact of Anonymised PPID/PPS signals on ad
 * requests that already carry the client's own PPID. By requiring PPID Status =
 * Active in both groups, this analysis isolates the uplift attributable to
 * Anonymised signal enrichment above the baseline that the client's native PPID
 * already delivers.
 *
 * ==================================================================================
 * RANDOMISED CONTROL TRIAL DESIGN:
 * ==================================================================================
 *
 * TREATMENT GROUP (TG):
 *   Ad requests enriched with Anonymised signals (CD0 = 1 or CD0 = 3) where the
 *   client's own PPID is also active and no third-party ID is present.
 *
 * CONTROL GROUP (CG):
 *   Ad requests where Anonymised signals are deliberately withheld (CD0 = 8) but
 *   the client's own PPID is still active and no third-party ID is present.
 *
 * This design answers: "How much additional revenue do Anonymised signals generate
 * on top of what the client's existing PPID already delivers?"
 *
 * KEY VALUE (CD0) ASSIGNMENTS:
 *   - CD0 = 1: Anonymised PPID-only signal set
 *   - CD0 = 3: Anonymised Combined Signals (PPID + PPS both set)
 *   - CD0 = 8: Control Group (Anonymised signals deliberately withheld)
 *
 * ==================================================================================
 * CRITICAL DIMENSIONS FOR MEASUREMENT:
 * ==================================================================================
 *
 * 1. PPID STATUS (Publisher Provided Identifier — the client's own PPID):
 *    - Active: Client PPID present in ad request and usable by Google
 *    - Missing: Client PPID not present in ad request (excluded from this analysis)
 *    - Restricted: Client PPID present but restricted by consent (excluded)
 *
 * 2. THIRD-PARTY ID STATUS (e.g., cookies, MAIDs):
 *    - Active: Third-party identifier present and usable (excluded from this analysis)
 *    - Missing: No third-party identifier present (required for this analysis)
 *    - Restricted: Third-party ID present but restricted (excluded)
 *
 * 3. DEMAND CHANNEL:
 *    - AD_EXCHANGE (AdX): Programmatic auction revenue
 *    - AD_SERVER (AdS): Direct and other ad server revenue
 *
 * ==================================================================================
 * SIGNAL TYPE ISOLATION LOGIC:
 * ==================================================================================
 *
 * Both signal types require PPID Status = Active (client PPID present) and
 * TPID Status = Missing (no third-party ID) across both TG and CG, to ensure a
 * clean comparison within the same cookieless, client-PPID-enabled traffic pool.
 *
 * PPID-ONLY (CD0 = 1):
 * --------------------
 *   Treatment Group (TG):
 *     - CD0 = 1 (Anonymised PPID signal enrichment active)
 *     - PPID Status = Active (client PPID present)
 *     - Third-party ID Status = Missing
 *
 *   Control Group (CG):
 *     - CD0 = 8 (Anonymised signals withheld)
 *     - PPID Status = Active (client PPID present)
 *     - Third-party ID Status = Missing
 *
 * COMBINED SIGNALS (CD0 = 3):
 * ---------------------------
 *   Treatment Group (TG):
 *     - CD0 = 3 (Anonymised PPID + PPS signal enrichment active)
 *     - PPID Status = Active (client PPID present)
 *     - Third-party ID Status = Missing
 *
 *   Control Group (CG):
 *     - CD0 = 8 (Anonymised signals withheld)
 *     - PPID Status = Active (client PPID present)
 *     - Third-party ID Status = Missing
 *
 * ==================================================================================
 * EXCLUSIONS (Applied to Both Signal Types):
 * ==================================================================================
 *
 * - PPID Status = Missing (client PPID absent — not relevant to this comparison)
 * - PPID Status = Restricted (client PPID unusable due to consent)
 * - Third-party ID Status != Missing (Active and Restricted rows are excluded)
 * - CD0 = (not applicable) or empty
 * - Demand Channel != AD_EXCHANGE and != AD_SERVER
 *
 * ==================================================================================
 * CALCULATION METHODOLOGY:
 * ==================================================================================
 *
 * For each Signal Type (PPID-only and Combined Signals) and Channel (AdX, AdS):
 *
 * Step 1: Aggregate by date
 *   - Sum impressions, revenue, and ad requests for TG and CG separately
 *
 * Step 2: Calculate eCPM (effective Cost Per Mille)
 *   - TG eCPM = (TG Revenue / TG Ad Requests) x 1000
 *   - CG eCPM = (CG Revenue / CG Ad Requests) x 1000
 *
 *   Note: eCPM combines both CPM and fill rate into a single metric
 *
 * Step 3: Calculate eCPM Uplift
 *   - eCPM Uplift = TG eCPM - CG eCPM
 *
 * Step 4: Calculate Revenue Uplift and Revenue %
 *   - Revenue Uplift = (eCPM Uplift x TG Ad Requests) / 1000
 *   - Revenue % = Revenue Uplift / TG Revenue x 100%
 *
 *   Revenue Uplift represents the incremental revenue from Anonymised signal
 *   enrichment above the client's baseline PPID performance.
 *   Revenue % expresses that uplift as a percentage of the treatment group's revenue.
 *
 * ==================================================================================
 * METRICS CALCULATED:
 * ==================================================================================
 *
 * Per Group (TG and CG):
 *   - Total Impressions (filled ad requests)
 *   - Total Revenue (from GAM)
 *   - Total Ad Requests (filled + unfilled impressions)
 *   - Unfilled Impressions (Ad Requests - Impressions)
 *   - eCPM (Revenue / Ad Requests x 1000)
 *
 * Uplift Metrics:
 *   - Fill Rate Uplift (TG Fill Rate - CG Fill Rate)
 *   - eCPM Uplift (absolute difference)
 *   - Revenue % (Revenue Uplift as % of TG Revenue)
 *   - Revenue Uplift (incremental revenue from Anonymised signals)
 *
 * ==================================================================================
 * OUTPUT STRUCTURE:
 * ==================================================================================
 *
 * One pair of output sheets per month:
 *
 * 1. "{Mon} {Year} - PPID-only"
 *    - Incremental uplift from Anonymised PPID signal on top of client PPID
 *
 * 2. "{Mon} {Year} - PPID+PPS"
 *    - Incremental uplift from Anonymised PPID + PPS signals on top of client PPID
 *
 * Each sheet contains:
 *   - 3-row header (channel / group / metric)
 *   - Row 4: TOTAL (aggregated/weighted-average formulas)
 *   - Row 5+: Daily data rows covering the full calendar month
 *   - Revenue Uplift summary box below the data
 *   - Optional: Browser, Device, and Inventory coverage tables
 *
 * One summary sheet per year: "{Year} Summary"
 *   - Cross-references all monthly sheets for the year
 *   - Columns: AD REQUESTS, REVENUE UPLIFT, RELATIVE UPLIFT
 *   - Sub-columns: PPID-only, PPID+PPS, Total
 *
 * ==================================================================================
 */
// ============================================================
// MAIN ENTRY POINT
// Reads the source sheet, aggregates data by signal lift group,
// then splits by month and generates one pair of output sheets
// per month (e.g. "Jan - PPID-only", "Jan - PPID+PPS").
// After all monthly sheets are built, generates the "2026 Summary"
// sheet that cross-references them.
// ============================================================
function buildPPIDComparisonReport() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName('Raw Data');

    // -------------------------------------------------------
    // COLUMN INDEX LOOKUP
    // Safely resolves header names to zero-based column indices.
    // Returns null if a column is missing.
    // -------------------------------------------------------
    const header = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
    const safeColIndex = (name) => {
        const idx = header.indexOf(name);
        return idx === -1 ? null : idx;
    };

    const DATE_COL = safeColIndex('Date');
    const CD0_COL = safeColIndex('Custom Dimension Value');
    const PPID_STATUS_COL = safeColIndex('PPID status');
    const TPID_STATUS_COL = safeColIndex('Third-party ID status');
    const DEMAND_CHANNEL_COL = safeColIndex('Demand channel');
    const IMPRESSIONS_COL = safeColIndex('Total impressions');
    const ADX_REV_COL = safeColIndex('Ad Exchange revenue');
    const ADS_REV_COL = safeColIndex('Ad server total revenue');
    const AD_REQUESTS_COL = safeColIndex('Total ad requests');

    // -------------------------------------------------------
    // VALIDATION
    // If any critical column is missing, write an error and stop.
    // -------------------------------------------------------
    if (DATE_COL === null || PPID_STATUS_COL === null || DEMAND_CHANNEL_COL === null ||
        CD0_COL === null || TPID_STATUS_COL === null) {
        const outputSheet = ss.getSheetByName('Error Log') || ss.insertSheet('Error Log');
        outputSheet.clearContents();
        outputSheet.getRange(1, 1).setValue('ERROR: Missing required columns.');
        return;
    }

    const lastRow = sourceSheet.getLastRow();
    const lastCol = sourceSheet.getLastColumn();
    const CHUNK_SIZE = 2000;

    // -------------------------------------------------------
    // DATA STRUCTURES
    // treatmentData / controlData hold aggregated metrics keyed
    // by date string (yyyy-MM-dd), nested under signal type and
    // demand channel (adx / ads).
    // -------------------------------------------------------
    const treatmentData = { ppidOnly: { adx: {}, ads: {} }, combined: { adx: {}, ads: {} } };
    const controlData = { ppidOnly: { adx: {}, ads: {} }, combined: { adx: {}, ads: {} } };

    // -------------------------------------------------------
    // UTILITY FUNCTIONS
    // -------------------------------------------------------

    // Converts a Date object (or any value) to a yyyy-MM-dd string.
    // Handles both native Date objects and datetime strings like '2026-01-14 00:00:00'.
    const ensureDateKey = (v) => {
        if (v instanceof Date) {
            return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        const s = String(v);
        // If the string starts with a yyyy-MM-dd date, extract just that part.
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
        return s;
    };

    // Accumulates impressions, revenue, and ad requests into a
    // map keyed by date string.
    const addToMap = (map, d, i, r, a) => {
        if (!map[d]) map[d] = { impressions: 0, revenue: 0, adRequests: 0 };
        map[d].impressions += Number(i) || 0;
        map[d].revenue += Number(r) || 0;
        map[d].adRequests += Number(a) || 0;
    };

    // Merges all entries from source map into target map.
    const mergeMaps = (t, s) => Object.keys(s).forEach(k =>
        addToMap(t, k, s[k].impressions, s[k].revenue, s[k].adRequests)
    );

    // Normalises status strings to Title Case equivalents.
    const norm = (v) => {
        const x = String(v || '').toLowerCase().trim();
        if (x === 'active') return 'Active';
        if (x === 'missing') return 'Missing';
        if (x === 'restricted') return 'Restricted';
        return x;
    };

    // -------------------------------------------------------
    // CHUNKED ROW PROCESSING
    // Reads the source sheet in chunks of CHUNK_SIZE rows to
    // avoid hitting Apps Script memory limits on large datasets.
    // Each row is classified into treatment or control based on
    // the CD0 value, PPID status, and TPID status.
    // -------------------------------------------------------
    for (let start = 2; start <= lastRow; start += CHUNK_SIZE) {
        const rows = sourceSheet.getRange(start, 1, Math.min(CHUNK_SIZE, lastRow - start + 1), lastCol).getValues();

        // Local chunk accumulators — merged into the global maps after each chunk.
        const lt = { ppidOnly: { adx: {}, ads: {} }, combined: { adx: {}, ads: {} } };
        const lc = { ppidOnly: { adx: {}, ads: {} }, combined: { adx: {}, ads: {} } };

        rows.forEach(r => {
            const cd0 = String(r[CD0_COL] || '');
            const ppid = norm(r[PPID_STATUS_COL]);
            const tpid = norm(r[TPID_STATUS_COL]);
            const demand = r[DEMAND_CHANNEL_COL];

            // Skip rows that are not usable: empty CD0, not-applicable, or non-Active PPID.
            if (!cd0 || cd0 === '(not applicable)' || ppid !== 'Active') return;
            // Only process AD_EXCHANGE and AD_SERVER demand channels.
            if (demand !== 'AD_EXCHANGE' && demand !== 'AD_SERVER') return;
            // All analysis is restricted to TPID = Missing.
            if (tpid !== 'Missing') return;

            const date = ensureDateKey(r[DATE_COL]);
            const imps = r[IMPRESSIONS_COL] || 0;
            const reqs = r[AD_REQUESTS_COL] || 0;
            // Revenue source depends on demand channel.
            const rev = demand === 'AD_EXCHANGE' ? r[ADX_REV_COL] || 0 : r[ADS_REV_COL] || 0;
            const ch = demand === 'AD_EXCHANGE' ? 'adx' : 'ads';

            // --- TREATMENT GROUP classification ---
            // CD0 = 1, PPID Active, TPID Missing → PPID-only treatment
            if (cd0 === '1')
                addToMap(lt.ppidOnly[ch], date, imps, rev, reqs);
            // CD0 = 3, PPID Active, TPID Missing → Combined treatment
            if (cd0 === '3')
                addToMap(lt.combined[ch], date, imps, rev, reqs);

            // --- CONTROL GROUP classification ---
            // CD0 = 8, PPID Active, TPID Missing → control bucket for both signal types
            if (cd0 === '8') {
                addToMap(lc.ppidOnly[ch], date, imps, rev, reqs);
                addToMap(lc.combined[ch], date, imps, rev, reqs);
            }
        });

        // Merge local chunk maps into global accumulators.
        mergeMaps(treatmentData.ppidOnly.adx, lt.ppidOnly.adx);
        mergeMaps(treatmentData.ppidOnly.ads, lt.ppidOnly.ads);
        mergeMaps(treatmentData.combined.adx, lt.combined.adx);
        mergeMaps(treatmentData.combined.ads, lt.combined.ads);
        mergeMaps(controlData.ppidOnly.adx, lc.ppidOnly.adx);
        mergeMaps(controlData.ppidOnly.ads, lc.ppidOnly.ads);
        mergeMaps(controlData.combined.adx, lc.combined.adx);
        mergeMaps(controlData.combined.ads, lc.combined.ads);
    }

    // -------------------------------------------------------
    // SPLIT DATA BY MONTH
    // Collects all unique date keys across all maps, groups them
    // into yyyy-MM buckets, then calls generateOutput once per
    // (month x signal type) combination.
    // -------------------------------------------------------
    const allDateKeys = new Set([
        ...Object.keys(treatmentData.ppidOnly.adx),
        ...Object.keys(treatmentData.ppidOnly.ads),
        ...Object.keys(treatmentData.combined.adx),
        ...Object.keys(treatmentData.combined.ads),
        ...Object.keys(controlData.ppidOnly.adx),
        ...Object.keys(controlData.ppidOnly.ads),
        ...Object.keys(controlData.combined.adx),
        ...Object.keys(controlData.combined.ads)
    ]);

    // Group date keys by "yyyy-MM"
    const monthBuckets = {};
    allDateKeys.forEach(dk => {
        const monthKey = dk.substring(0, 7); // e.g. "2025-01"
        if (!monthBuckets[monthKey]) monthBuckets[monthKey] = new Set();
        monthBuckets[monthKey].add(dk);
    });

    // Helper: filters a nested {adx:{}, ads:{}} map down to only dates within a given month.
    function filterByMonth(dataObj, monthKey) {
        const filtered = { adx: {}, ads: {} };
        ['adx', 'ads'].forEach(ch => {
            Object.keys(dataObj[ch]).forEach(dk => {
                if (dk.startsWith(monthKey)) filtered[ch][dk] = dataObj[ch][dk];
            });
        });
        return filtered;
    }

    // Month abbreviation lookup for sheet naming (e.g. "01" → "Jan")
    const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // -------------------------------------------------------
    // CLEANUP OLD SHEETS
    // Delete any existing monthly or summary sheets from previous
    // runs to avoid duplicates. We'll regenerate all of them.
    // -------------------------------------------------------
    const allSheets = ss.getSheets();
    allSheets.forEach(sheet => {
        const name = sheet.getName();
        // Delete if it matches the old pattern without year (e.g. "Jan - PPID-only")
        // OR matches the new pattern with year (e.g. "Jan 2026 - PPID-only")
        // OR matches summary pattern (e.g. "2026 Summary")
        if (
            /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*-\s*(PPID-only|PPID\+PPS)$/.test(name) ||
            /^\d{4}\s+Summary$/.test(name)
        ) {
            ss.deleteSheet(sheet);
        }
    });

    // -------------------------------------------------------
    // GROUP MONTHS BY YEAR
    // Build a year → monthKeys map so we can create one summary
    // sheet per year.
    // -------------------------------------------------------
    const yearBuckets = {};
    Object.keys(monthBuckets).forEach(monthKey => {
        const year = monthKey.substring(0, 4); // e.g. "2026"
        if (!yearBuckets[year]) yearBuckets[year] = [];
        yearBuckets[year].push(monthKey);
    });

    // -------------------------------------------------------
    // GENERATE MONTHLY SHEETS
    // Iterate over each month and generate the two report sheets
    // with year included in the sheet name (e.g. "Jan 2026 - PPID-only").
    // -------------------------------------------------------
    const sortedMonthKeys = Object.keys(monthBuckets).sort();

    sortedMonthKeys.forEach(monthKey => {
        const year = monthKey.substring(0, 4);         // e.g. "2026"
        const monthIndex = parseInt(monthKey.substring(5, 7), 10) - 1; // 0-based
        const monthAbbr = MONTH_ABBR[monthIndex];           // e.g. "Jan"

        generateOutput(
            ss,
            `${monthAbbr} ${year} - PPID-only`,
            filterByMonth(treatmentData.ppidOnly, monthKey),
            filterByMonth(controlData.ppidOnly, monthKey),
            monthKey
        );

        generateOutput(
            ss,
            `${monthAbbr} ${year} - PPID+PPS`,
            filterByMonth(treatmentData.combined, monthKey),
            filterByMonth(controlData.combined, monthKey),
            monthKey
        );
    });

    // -------------------------------------------------------
    // SUMMARY SHEETS
    // Built after all monthly sheets exist so that the cross-
    // sheet formulas have valid targets. One summary sheet is
    // created per year.
    // -------------------------------------------------------
    Object.keys(yearBuckets).sort().forEach(year => {
        buildSummarySheet(ss, year, yearBuckets[year]);
    });

    reorderSheets(ss);
}

// ============================================================
// SHEET REORDERING
// Orders sheets to match the Python pipeline output:
//   1. Summary sheets (most recent year first)
//   2. Monthly sheets (most recent month first, PPID-only before PPID+PPS)
//   3. Hides data/support sheets (Browser, Device, Inventory, Error Log)
// ============================================================
function reorderSheets(ss) {
    const summaryPattern = /^(\d{4})\s+Summary$/;
    const monthlyPattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s*-\s*(PPID-only|PPID\+PPS)$/;
    const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const HIDE_NAMES = ['browser', 'device', 'inventory', 'error log'];

    const summarySheets = [];
    const monthlySheets = [];
    const toHide = [];

    ss.getSheets().forEach(sheet => {
        const name = sheet.getName();
        let m;
        if ((m = summaryPattern.exec(name))) {
            summarySheets.push({ sortKey: parseInt(m[1]), sheet });
        } else if ((m = monthlyPattern.exec(name))) {
            const monthNum = MONTH_ABBR.indexOf(m[1]) + 1;
            const signalOrder = m[3] === 'PPID-only' ? 0 : 1;
            monthlySheets.push({ sortKey: parseInt(m[2]) * 1000 + monthNum * 10 + signalOrder, sheet });
        }
        if (HIDE_NAMES.includes(name.toLowerCase())) toHide.push(sheet);
    });

    summarySheets.sort((a, b) => b.sortKey - a.sortKey);
    monthlySheets.sort((a, b) => b.sortKey - a.sortKey);

    let position = 1;
    summarySheets.forEach(({ sheet }) => {
        ss.setActiveSheet(sheet);
        ss.moveActiveSheet(position++);
    });
    monthlySheets.forEach(({ sheet }) => {
        ss.setActiveSheet(sheet);
        ss.moveActiveSheet(position++);
    });

    toHide.forEach(sheet => sheet.hideSheet());
}

// ============================================================
// OUTPUT SHEET GENERATOR
// Builds a single formatted report sheet for one signal type
// and one month. Receives pre-filtered treatment/control maps
// and the monthKey (e.g. "2025-01") to determine the full
// date range to display.
// ============================================================
function generateOutput(ss, sheetName, treatment, control, monthKey) {
    let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.clearContents();

    // -------------------------------------------------------
    // FULL MONTH DATE RANGE
    // Generates every day in the month regardless of whether
    // source data exists for that day. Days without data will
    // have empty metric columns.
    // -------------------------------------------------------
    const year = parseInt(monthKey.substring(0, 4), 10);
    const month = parseInt(monthKey.substring(5, 7), 10) - 1; // JS months are 0-based

    // Last day of the month: day 0 of the NEXT month gives the last date of current month.
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    const dates = [];
    for (let d = 1; d <= lastDayOfMonth; d++) {
        const dd = String(d).padStart(2, '0');
        const mm = String(month + 1).padStart(2, '0');
        dates.push(`${year}-${mm}-${dd}`);
    }

    // -------------------------------------------------------
    // ROW COMPUTATION
    // For each date, pulls treatment/control metrics from both
    // ADX and ADS maps and computes fill rate, eCPM, uplift, 
    // and revenue uplift. Dates with no data produce all-zero rows.
    // -------------------------------------------------------
    function computeRow(dateKey) {
        const tgAdx = treatment.adx[dateKey] || { impressions: 0, revenue: 0, adRequests: 0 };
        const cgAdx = control.adx[dateKey] || { impressions: 0, revenue: 0, adRequests: 0 };
        const tgAds = treatment.ads[dateKey] || { impressions: 0, revenue: 0, adRequests: 0 };
        const cgAds = control.ads[dateKey] || { impressions: 0, revenue: 0, adRequests: 0 };

        const hasData =
            tgAdx.impressions || tgAdx.revenue || tgAdx.adRequests ||
            cgAdx.impressions || cgAdx.revenue || cgAdx.adRequests ||
            tgAds.impressions || tgAds.revenue || tgAds.adRequests ||
            cgAds.impressions || cgAds.revenue || cgAds.adRequests;

        // If no data at all for this date, return the date with all blanks.
        if (!hasData) {
            return [dateKey, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
        }

        // --- ADX Fill Rate, eCPM & uplift ---
        const tgAdxFillRate = tgAdx.adRequests > 0 ? tgAdx.impressions / tgAdx.adRequests : 0;
        const cgAdxFillRate = cgAdx.adRequests > 0 ? cgAdx.impressions / cgAdx.adRequests : 0;
        const tgAdxEcpm = tgAdx.adRequests > 0 ? tgAdx.revenue / tgAdx.adRequests * 1000 : 0;
        const cgAdxEcpm = cgAdx.adRequests > 0 ? cgAdx.revenue / cgAdx.adRequests * 1000 : 0;

        // Only compute uplift if TG has impressions
        const adxFillRateUplift = tgAdx.impressions > 0 ? (tgAdxFillRate - cgAdxFillRate) : '';
        const adxEcpmUplift = tgAdx.impressions > 0 ? (tgAdxEcpm - cgAdxEcpm) : '';
        const adxRevenueUplift = tgAdx.impressions > 0 ? (tgAdx.adRequests * (tgAdxEcpm - cgAdxEcpm) / 1000) : '';
        const adxRevPct = (tgAdx.impressions > 0 && tgAdx.revenue !== 0) ? (adxRevenueUplift / tgAdx.revenue) : '';

        // --- ADS Fill Rate, eCPM & uplift ---
        const tgAdsFillRate = tgAds.adRequests > 0 ? tgAds.impressions / tgAds.adRequests : 0;
        const cgAdsFillRate = cgAds.adRequests > 0 ? cgAds.impressions / cgAds.adRequests : 0;
        const tgAdsEcpm = tgAds.adRequests > 0 ? tgAds.revenue / tgAds.adRequests * 1000 : 0;
        const cgAdsEcpm = cgAds.adRequests > 0 ? cgAds.revenue / cgAds.adRequests * 1000 : 0;

        // Only compute uplift if TG has impressions
        const adsFillRateUplift = tgAds.impressions > 0 ? (tgAdsFillRate - cgAdsFillRate) : '';
        const adsEcpmUplift = tgAds.impressions > 0 ? (tgAdsEcpm - cgAdsEcpm) : '';
        const adsRevenueUplift = tgAds.impressions > 0 ? (tgAds.adRequests * (tgAdsEcpm - cgAdsEcpm) / 1000) : '';
        const adsRevPct = (tgAds.impressions > 0 && tgAds.revenue !== 0) ? (adsRevenueUplift / tgAds.revenue) : '';

        return [
            dateKey,
            // ADX Treatment (6 columns)
            tgAdx.impressions, tgAdx.revenue, tgAdx.adRequests, tgAdx.adRequests - tgAdx.impressions, tgAdxFillRate, tgAdxEcpm,
            // ADX Control (6 columns)
            cgAdx.impressions, cgAdx.revenue, cgAdx.adRequests, cgAdx.adRequests - cgAdx.impressions, cgAdxFillRate, cgAdxEcpm,
            // ADX Uplift (4 columns)
            adxFillRateUplift, adxEcpmUplift, adxRevPct, adxRevenueUplift,
            // ADS Treatment (6 columns)
            tgAds.impressions, tgAds.revenue, tgAds.adRequests, tgAds.adRequests - tgAds.impressions, tgAdsFillRate, tgAdsEcpm,
            // ADS Control (6 columns)
            cgAds.impressions, cgAds.revenue, cgAds.adRequests, cgAds.adRequests - cgAds.impressions, cgAdsFillRate, cgAdsEcpm,
            // ADS Uplift (4 columns)
            adsFillRateUplift, adsEcpmUplift, adsRevPct, adsRevenueUplift
        ];
    }

    const rows = dates.map(computeRow);

    // -------------------------------------------------------
    // HEADERS (3 rows: main channel, group, metric name)
    // -------------------------------------------------------
    const headerRow1 = [
        'DATE',
        'AD EXCHANGE', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        'AD SERVER', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    ];
    const headerRow2 = [
        '',
        'TREATMENT GROUP', '', '', '', '', '',
        'CONTROL GROUP', '', '', '', '', '',
        'UPLIFT', '', '', '',
        'TREATMENT GROUP', '', '', '', '', '',
        'CONTROL GROUP', '', '', '', '', '',
        'UPLIFT', '', '', ''
    ];
    const headerRow3 = [
        '',
        'Impressions', 'Revenue', 'Ad Requests', 'Unfilled', 'Fill Rate', 'eCPM',
        'Impressions', 'Revenue', 'Ad Requests', 'Unfilled', 'Fill Rate', 'eCPM',
        'Fill Rate Uplift', 'eCPM Uplift', 'Revenue %', 'Revenue',
        'Impressions', 'Revenue', 'Ad Requests', 'Unfilled', 'Fill Rate', 'eCPM',
        'Impressions', 'Revenue', 'Ad Requests', 'Unfilled', 'Fill Rate', 'eCPM',
        'Fill Rate Uplift', 'eCPM Uplift', 'Revenue %', 'Revenue'
    ];

    sheet.getRange(1, 1, 3, 33).setValues([headerRow1, headerRow2, headerRow3]);

    // -------------------------------------------------------
    // HEADER FORMATTING & MERGING
    // -------------------------------------------------------

    // Main channel headers — black background, white bold text
    sheet.getRange(1, 2, 1, 16).merge().setHorizontalAlignment('center')
        .setBackground('#000000').setFontColor('#ffffff').setFontWeight('bold');
    sheet.getRange(1, 18, 1, 16).merge().setHorizontalAlignment('center')
        .setBackground('#000000').setFontColor('#ffffff').setFontWeight('bold');

    // Treatment group headers — light green
    sheet.getRange(2, 2, 1, 6).merge().setHorizontalAlignment('center')
        .setBackground('#b6d7a8').setFontWeight('bold');
    sheet.getRange(2, 18, 1, 6).merge().setHorizontalAlignment('center')
        .setBackground('#b6d7a8').setFontWeight('bold');

    // Control group headers — light red
    sheet.getRange(2, 8, 1, 6).merge().setHorizontalAlignment('center')
        .setBackground('#ea9999').setFontWeight('bold');
    sheet.getRange(2, 24, 1, 6).merge().setHorizontalAlignment('center')
        .setBackground('#ea9999').setFontWeight('bold');

    // Uplift headers — light blue
    sheet.getRange(2, 14, 1, 4).merge().setHorizontalAlignment('center')
        .setBackground('#9fc5e8').setFontWeight('bold');
    sheet.getRange(2, 30, 1, 4).merge().setHorizontalAlignment('center')
        .setBackground('#9fc5e8').setFontWeight('bold');

    // DATE column header — merged across all 3 header rows, vertically centred
    sheet.getRange(1, 1, 3, 1).merge().setVerticalAlignment('middle').setHorizontalAlignment('center');

    // General header formatting
    sheet.getRange(1, 1, 3, 33).setFontWeight('bold');
    sheet.getRange(3, 1, 1, 33).setBackground('#f3f3f3'); // Subtle grey on metric-name row

    // -------------------------------------------------------
    // FREEZE PANES
    // Freeze 4 rows (3 header rows + TOTAL row) and 1 column (DATE).
    // -------------------------------------------------------
    sheet.setFrozenRows(4);
    sheet.setFrozenColumns(1);

    // -------------------------------------------------------
    // TOTAL ROW & DATA ROWS
    // TOTAL is written in row 4; daily data starts at row 5.
    // -------------------------------------------------------
    const totalsRow = 4;
    const dataStartRow = totalsRow + 1;
    const dataEndRow = dataStartRow + rows.length - 1;

    sheet.getRange(totalsRow, 1).setValue('TOTAL');
    sheet.getRange(dataStartRow, 1, rows.length, 33).setValues(rows);

    // --- SUM formulas on the TOTAL row (count-based columns) ---
    // Impressions, Revenue, Ad Requests, Unfilled for both TG and CG, both channels
    // ADX TG: 2,3,4,5  ADX CG: 8,9,10,11  ADS TG: 18,19,20,21  ADS CG: 24,25,26,27
    [2, 3, 4, 5, 8, 9, 10, 11, 18, 19, 20, 21, 24, 25, 26, 27].forEach(c => {
        sheet.getRange(totalsRow, c).setFormulaR1C1(`=SUM(R${dataStartRow}C:R${dataEndRow}C)`);
    });

    // --- Fill Rate formulas on the TOTAL row (ratio of sums) ---
    // ADX TG Fill Rate (col 6): Impressions (col 2) / Ad Requests (col 4)
    sheet.getRange(totalsRow, 6).setFormulaR1C1(`=IF(R${totalsRow}C4=0, 0, R${totalsRow}C2/R${totalsRow}C4)`);
    // ADX CG Fill Rate (col 12): Impressions (col 8) / Ad Requests (col 10)
    sheet.getRange(totalsRow, 12).setFormulaR1C1(`=IF(R${totalsRow}C10=0, 0, R${totalsRow}C8/R${totalsRow}C10)`);
    // ADS TG Fill Rate (col 22): Impressions (col 18) / Ad Requests (col 20)
    sheet.getRange(totalsRow, 22).setFormulaR1C1(`=IF(R${totalsRow}C20=0, 0, R${totalsRow}C18/R${totalsRow}C20)`);
    // ADS CG Fill Rate (col 28): Impressions (col 24) / Ad Requests (col 26)
    sheet.getRange(totalsRow, 28).setFormulaR1C1(`=IF(R${totalsRow}C26=0, 0, R${totalsRow}C24/R${totalsRow}C26)`);

    // --- eCPM formulas on the TOTAL row (WEIGHTED AVERAGE of daily eCPMs) ---
    // ADX TG eCPM: col 7 (weighted by col 4), ADX CG eCPM: col 13 (weighted by col 10)
    // ADS TG eCPM: col 23 (weighted by col 20), ADS CG eCPM: col 29 (weighted by col 26)
    const ecpmWeightCols = { 7: 4, 13: 10, 23: 20, 29: 26 };
    Object.entries(ecpmWeightCols).forEach(([c, w]) => {
        sheet.getRange(totalsRow, Number(c)).setFormulaR1C1(`=IFERROR(AVERAGE.WEIGHTED(R${dataStartRow}C:R${dataEndRow}C, R${dataStartRow}C${w}:R${dataEndRow}C${w}), 0)`);
    });

    // --- Uplift formulas on the TOTAL row ---
    // ADX Fill Rate Uplift (col 14): TG Fill Rate (col 6) - CG Fill Rate (col 12)
    sheet.getRange(totalsRow, 14).setFormulaR1C1(`=R${totalsRow}C6-R${totalsRow}C12`);
    // ADX eCPM Uplift (col 15): WEIGHTED AVERAGE of daily uplifts (weighted by col 4 — TG ADX Ad Requests)
    sheet.getRange(totalsRow, 15).setFormulaR1C1(`=IFERROR(AVERAGE.WEIGHTED(R${dataStartRow}C:R${dataEndRow}C, R${dataStartRow}C4:R${dataEndRow}C4), 0)`);
    // ADX Revenue % (col 16): WEIGHTED AVERAGE by TG Revenue (col 3)
    sheet.getRange(totalsRow, 16).setFormulaR1C1(`=IFERROR(AVERAGE.WEIGHTED(R${dataStartRow}C:R${dataEndRow}C, R${dataStartRow}C3:R${dataEndRow}C3), 0)`);
    // ADX Revenue Uplift (col 17): SUM of daily revenue uplifts
    sheet.getRange(totalsRow, 17).setFormulaR1C1(`=SUM(R${dataStartRow}C:R${dataEndRow}C)`);

    // ADS Fill Rate Uplift (col 30): TG Fill Rate (col 22) - CG Fill Rate (col 28)
    sheet.getRange(totalsRow, 30).setFormulaR1C1(`=R${totalsRow}C22-R${totalsRow}C28`);
    // ADS eCPM Uplift (col 31): WEIGHTED AVERAGE of daily uplifts (weighted by col 20 — TG ADS Ad Requests)
    sheet.getRange(totalsRow, 31).setFormulaR1C1(`=IFERROR(AVERAGE.WEIGHTED(R${dataStartRow}C:R${dataEndRow}C, R${dataStartRow}C20:R${dataEndRow}C20), 0)`);
    // ADS Revenue % (col 32): WEIGHTED AVERAGE by TG Revenue (col 19)
    sheet.getRange(totalsRow, 32).setFormulaR1C1(`=IFERROR(AVERAGE.WEIGHTED(R${dataStartRow}C:R${dataEndRow}C, R${dataStartRow}C19:R${dataEndRow}C19), 0)`);
    // ADS Revenue Uplift (col 33): SUM of daily revenue uplifts
    sheet.getRange(totalsRow, 33).setFormulaR1C1(`=SUM(R${dataStartRow}C:R${dataEndRow}C)`);

    // Make TOTAL row bold
    sheet.getRange(totalsRow, 1, 1, 33).setFontWeight('bold');

    // -------------------------------------------------------
    // CONDITIONAL FORMATTING — Revenue Uplift columns
    // Green if positive, red if negative. Applied to both the
    // data rows and the TOTAL row for columns 17 (ADX) and 33 (ADS).
    // -------------------------------------------------------
    const adxUpliftCol = 17;
    const adsUpliftCol = 33;

    for (let row = dataStartRow; row <= dataEndRow; row++) {
        const adxCell = sheet.getRange(row, adxUpliftCol);
        const adxVal = adxCell.getValue();
        if (adxVal > 0) adxCell.setBackground('#b6d7a8');
        else if (adxVal < 0) adxCell.setBackground('#ea9999');

        const adsCell = sheet.getRange(row, adsUpliftCol);
        const adsVal = adsCell.getValue();
        if (adsVal > 0) adsCell.setBackground('#b6d7a8');
        else if (adsVal < 0) adsCell.setBackground('#ea9999');
    }

    // Conditional formatting on TOTAL row uplift cells
    const adxTotal = sheet.getRange(totalsRow, adxUpliftCol);
    const adxTotalVal = adxTotal.getValue();
    if (adxTotalVal > 0) adxTotal.setBackground('#b6d7a8');
    else if (adxTotalVal < 0) adxTotal.setBackground('#ea9999');

    const adsTotal = sheet.getRange(totalsRow, adsUpliftCol);
    const adsTotalVal = adsTotal.getValue();
    if (adsTotalVal > 0) adsTotal.setBackground('#b6d7a8');
    else if (adsTotalVal < 0) adsTotal.setBackground('#ea9999');

    // -------------------------------------------------------
    // BORDERS
    // 1. Solid black border on the BOTTOM of the last data row
    //    (separates data from the summary table below).
    // 2. Solid black border on the RIGHT side of column 17
    //    (separates AD Exchange from AD Server sections).
    // The vertical border is applied row-by-row to avoid merged-
    // cell suppression in the header rows. On dataEndRow both
    // bottom and right are set in a single call so neither
    // overwrites the other.
    // -------------------------------------------------------

    // Vertical border rows 1 through dataEndRow - 1 (right only).
    for (let row = 1; row < dataEndRow; row++) {
        sheet.getRange(row, 17).setBorder(
            false, false, false, true, false, false,
            '#000000',
            SpreadsheetApp.BorderStyle.SOLID
        );
    }

    // Last data row: bottom across all 33 columns first.
    sheet.getRange(dataEndRow, 1, 1, 33).setBorder(
        false, false, true, false, false, false,
        '#000000',
        SpreadsheetApp.BorderStyle.SOLID
    );

    // Last data row col 17: both bottom AND right in one call.
    sheet.getRange(dataEndRow, 17).setBorder(
        false, false, true, true, false, false,
        '#000000',
        SpreadsheetApp.BorderStyle.SOLID
    );

    // -------------------------------------------------------
    // NUMBER FORMATTING
    // -------------------------------------------------------

    // Currency columns (Revenue, eCPM, Uplift values) — no symbol format
    const moneyCols = [3, 7, 9, 13, 15, 17, 19, 23, 25, 29, 31, 33];
    moneyCols.forEach(c =>
        sheet.getRange(dataStartRow, c, rows.length, 1).setNumberFormat('#,##0.00')
    );

    // Percentage columns (Fill Rate, Revenue %, Fill Rate Uplift)
    // Fill Rates: 6, 12, 22, 28
    // Fill Rate Uplifts: 14, 30
    // Revenue %: 16, 32
    const percentCols = [6, 12, 14, 16, 22, 28, 30, 32];
    percentCols.forEach(c =>
        sheet.getRange(dataStartRow, c, rows.length, 1).setNumberFormat('0.00%')
    );

    // Integer columns: Impressions, Ad Requests, AND Unfilled Impressions
    // ADX TG: 2, 4, 5
    // ADX CG: 8, 10, 11
    // ADS TG: 18, 20, 21
    // ADS CG: 24, 26, 27
    const integerCols = [2, 4, 5, 8, 10, 11, 18, 20, 21, 24, 26, 27];
    integerCols.forEach(c =>
        sheet.getRange(dataStartRow, c, rows.length, 1).setNumberFormat('#,##0')
    );

    // Apply number formatting to TOTAL row as well
    // Currency columns in TOTAL row
    moneyCols.forEach(c =>
        sheet.getRange(totalsRow, c).setNumberFormat('#,##0.00')
    );

    // Percentage columns in TOTAL row
    percentCols.forEach(c =>
        sheet.getRange(totalsRow, c).setNumberFormat('0.00%')
    );

    // Integer columns in TOTAL row
    integerCols.forEach(c =>
        sheet.getRange(totalsRow, c).setNumberFormat('#,##0')
    );

    // -------------------------------------------------------
    // REVENUE UPLIFT SUMMARY TABLE
    // Placed two rows below the last data row.
    // -------------------------------------------------------
    const summaryRow = dataEndRow + 2;
    const startCol = 4;

    sheet.getRange(summaryRow, startCol).setValue('REVENUE UPLIFT');
    sheet.getRange(summaryRow + 1, startCol).setValue('Ad Exchange');
    sheet.getRange(summaryRow + 1, startCol + 1).setFormulaR1C1(`=R${totalsRow}C17`);
    sheet.getRange(summaryRow + 2, startCol).setValue('Ad Server');
    sheet.getRange(summaryRow + 2, startCol + 1).setFormulaR1C1(`=R${totalsRow}C33`);
    sheet.getRange(summaryRow + 3, startCol).setValue('Total');
    sheet.getRange(summaryRow + 3, startCol + 1).setFormulaR1C1(`=R${totalsRow}C17+R${totalsRow}C33`);

    // Summary header formatting — black background, white bold text
    sheet.getRange(summaryRow, startCol, 1, 2).setFontWeight('bold')
        .setBackground('#000000').setFontColor('#ffffff');

    // Bold the "Total" row in the summary
    sheet.getRange(summaryRow + 3, startCol, 1, 2).setFontWeight('bold');

    // Currency format on summary value cells
    sheet.getRange(summaryRow + 1, startCol + 1, 3, 1).setNumberFormat('#,##0.00');

    // Conditional formatting on summary values
    [[summaryRow + 1, startCol + 1], [summaryRow + 2, startCol + 1], [summaryRow + 3, startCol + 1]].forEach(([r, c]) => {
        const cell = sheet.getRange(r, c);
        const val = cell.getValue();
        if (val > 0) cell.setBackground('#b6d7a8');
        else if (val < 0) cell.setBackground('#ea9999');
    });

    // -------------------------------------------------------
    // BROWSER COVERAGE TABLE
    // Placed 2 rows below the REVENUE UPLIFT table.
    // Reads from the "browser" sheet and filters by month.
    // -------------------------------------------------------
    const browserRow = summaryRow + 5;

    // Get browser data from the "browser" sheet
    const browserSheet = ss.getSheetByName('Browser');
    if (browserSheet) {
        const browserData = browserSheet.getDataRange().getValues();
        const browserHeader = browserData[0];

        // Find column indices in browser sheet
        const monthColIdx = browserHeader.indexOf('MONTH');
        const browserNameIdx = browserHeader.indexOf('BROWSER_NAME');
        const adxEcpmIdx = browserHeader.indexOf('ADX_ECPM');
        const adsEcpmIdx = browserHeader.indexOf('ADS_ECPM');
        const impressionsPctIdx = browserHeader.indexOf('IMPRESSIONS_PCT');
        const customDimensionIdx = browserHeader.indexOf('CUSTOM_DIMENSION');

        if (monthColIdx !== -1 && browserNameIdx !== -1 && adxEcpmIdx !== -1 &&
            adsEcpmIdx !== -1 && impressionsPctIdx !== -1 && customDimensionIdx !== -1) {

            // Extract year and month from monthKey (format: "2026-01")
            const targetYear = parseInt(monthKey.substring(0, 4), 10);
            const targetMonth = parseInt(monthKey.substring(5, 7), 10);

            // Determine which CUSTOM_DIMENSION to filter by based on sheet name
            // PPID-only sheets → CUSTOM_DIMENSION = 1
            // PPID+PPS sheets → CUSTOM_DIMENSION = 3
            const targetCustomDimension = sheetName.includes('PPID-only') ? '1' : '3';

            // Filter browser data for this month
            const monthBrowserData = [];
            for (let i = 1; i < browserData.length; i++) {
                const row = browserData[i];
                const dateValue = row[monthColIdx];
                const customDimension = String(row[customDimensionIdx]);

                if (customDimension !== targetCustomDimension) continue;

                // Handle both native Date objects and date strings (e.g. "2026-01-01")
                let rowYear, rowMonth;
                if (dateValue instanceof Date) {
                    rowYear = dateValue.getFullYear();
                    rowMonth = dateValue.getMonth() + 1;
                } else {
                    const s = String(dateValue || '');
                    if (!/^\d{4}-\d{2}/.test(s)) continue;
                    rowYear = parseInt(s.substring(0, 4), 10);
                    rowMonth = parseInt(s.substring(5, 7), 10);
                }

                if (rowYear === targetYear && rowMonth === targetMonth) {
                    monthBrowserData.push({
                        browser: row[browserNameIdx],
                        impressionsPct: Number(row[impressionsPctIdx]) || 0,
                        adxEcpm: Number(row[adxEcpmIdx]) || 0,
                        adsEcpm: Number(row[adsEcpmIdx]) || 0
                    });
                }
            }

            // Only create the table if we have browser data for this month
            if (monthBrowserData.length > 0) {
                // Header row - merged across all 4 columns
                sheet.getRange(browserRow, startCol, 1, 4).merge()
                    .setValue('BROWSER COVERAGE')
                    .setHorizontalAlignment('center')
                    .setVerticalAlignment('middle')
                    .setFontWeight('bold')
                    .setBackground('#000000')
                    .setFontColor('#ffffff');

                // Column headers
                const browserHeaders = ['Browser type', 'Impressions (%)', 'eCPM AdX', 'eCPM AdS'];
                sheet.getRange(browserRow + 1, startCol, 1, 4).setValues([browserHeaders]);
                sheet.getRange(browserRow + 1, startCol, 1, 4).setFontWeight('bold').setBackground('#f3f3f3');

                // Data rows
                const browserRows = monthBrowserData.map(d => [
                    d.browser,
                    d.impressionsPct,
                    d.adxEcpm,
                    d.adsEcpm
                ]);

                sheet.getRange(browserRow + 2, startCol, browserRows.length, 4).setValues(browserRows);

                // Number formatting
                // Impressions % column (startCol + 1)
                sheet.getRange(browserRow + 2, startCol + 1, browserRows.length, 1).setNumberFormat('0.00%');

                // eCPM columns (startCol + 2 and startCol + 3)
                sheet.getRange(browserRow + 2, startCol + 2, browserRows.length, 2).setNumberFormat('#,##0.00');

                // Conditional formatting for eCPM columns
                for (let row = 0; row < browserRows.length; row++) {
                    const actualRow = browserRow + 2 + row;

                    // eCPM AdX column (startCol + 2)
                    const adxCell = sheet.getRange(actualRow, startCol + 2);
                    const adxVal = adxCell.getValue();
                    if (adxVal > 0) adxCell.setBackground('#b6d7a8');
                    else if (adxVal < 0) adxCell.setBackground('#ea9999');

                    // eCPM AdS column (startCol + 3)
                    const adsCell = sheet.getRange(actualRow, startCol + 3);
                    const adsVal = adsCell.getValue();
                    if (adsVal > 0) adsCell.setBackground('#b6d7a8');
                    else if (adsVal < 0) adsCell.setBackground('#ea9999');
                }
            }
        }
    }

    // -------------------------------------------------------
    // DEVICE COVERAGE TABLE
    // Placed 1 column to the right of BROWSER COVERAGE table.
    // Reads from the "device" sheet and filters by month.
    // -------------------------------------------------------
    const deviceCol = startCol + 5; // 1 column after browser table (which spans 4 columns)

    // Get device data from the "device" sheet
    const deviceSheet = ss.getSheetByName('Device');
    if (deviceSheet) {
        const deviceData = deviceSheet.getDataRange().getValues();
        const deviceHeader = deviceData[0];

        // Find column indices in device sheet
        const monthColIdx = deviceHeader.indexOf('MONTH');
        const deviceNameIdx = deviceHeader.indexOf('DEVICE_CATEGORY_NAME');
        const adxEcpmIdx = deviceHeader.indexOf('ADX_ECPM');
        const adsEcpmIdx = deviceHeader.indexOf('ADS_ECPM');
        const impressionsPctIdx = deviceHeader.indexOf('IMPRESSIONS_PCT');
        const customDimensionIdx = deviceHeader.indexOf('CUSTOM_DIMENSION');

        if (monthColIdx !== -1 && deviceNameIdx !== -1 && adxEcpmIdx !== -1 &&
            adsEcpmIdx !== -1 && impressionsPctIdx !== -1 && customDimensionIdx !== -1) {

            // Extract year and month from monthKey (format: "2026-01")
            const targetYear = parseInt(monthKey.substring(0, 4), 10);
            const targetMonth = parseInt(monthKey.substring(5, 7), 10);

            // Determine which CUSTOM_DIMENSION to filter by based on sheet name
            const targetCustomDimension = sheetName.includes('PPID-only') ? '1' : '3';

            // Filter device data for this month
            const monthDeviceData = [];
            for (let i = 1; i < deviceData.length; i++) {
                const row = deviceData[i];
                const dateValue = row[monthColIdx];
                const customDimension = String(row[customDimensionIdx]);

                if (customDimension !== targetCustomDimension) continue;

                // Handle both native Date objects and date strings (e.g. "2026-01-01")
                let rowYear, rowMonth;
                if (dateValue instanceof Date) {
                    rowYear = dateValue.getFullYear();
                    rowMonth = dateValue.getMonth() + 1;
                } else {
                    const s = String(dateValue || '');
                    if (!/^\d{4}-\d{2}/.test(s)) continue;
                    rowYear = parseInt(s.substring(0, 4), 10);
                    rowMonth = parseInt(s.substring(5, 7), 10);
                }

                if (rowYear === targetYear && rowMonth === targetMonth) {
                    monthDeviceData.push({
                        device: row[deviceNameIdx],
                        impressionsPct: Number(row[impressionsPctIdx]) || 0,
                        adxEcpm: Number(row[adxEcpmIdx]) || 0,
                        adsEcpm: Number(row[adsEcpmIdx]) || 0
                    });
                }
            }

            // Only create the table if we have device data for this month
            if (monthDeviceData.length > 0) {
                // Header row - merged across all 4 columns
                sheet.getRange(browserRow, deviceCol, 1, 4).merge()
                    .setValue('DEVICE COVERAGE')
                    .setHorizontalAlignment('center')
                    .setVerticalAlignment('middle')
                    .setFontWeight('bold')
                    .setBackground('#000000')
                    .setFontColor('#ffffff');

                // Column headers
                const deviceHeaders = ['Device type', 'Impressions (%)', 'eCPM AdX', 'eCPM AdS'];
                sheet.getRange(browserRow + 1, deviceCol, 1, 4).setValues([deviceHeaders]);
                sheet.getRange(browserRow + 1, deviceCol, 1, 4).setFontWeight('bold').setBackground('#f3f3f3');

                // Data rows
                const deviceRows = monthDeviceData.map(d => [
                    d.device,
                    d.impressionsPct,
                    d.adxEcpm,
                    d.adsEcpm
                ]);

                sheet.getRange(browserRow + 2, deviceCol, deviceRows.length, 4).setValues(deviceRows);

                // Number formatting
                // Impressions % column (deviceCol + 1)
                sheet.getRange(browserRow + 2, deviceCol + 1, deviceRows.length, 1).setNumberFormat('0.00%');

                // eCPM columns (deviceCol + 2 and deviceCol + 3)
                sheet.getRange(browserRow + 2, deviceCol + 2, deviceRows.length, 2).setNumberFormat('#,##0.00');

                // Conditional formatting for eCPM columns
                for (let row = 0; row < deviceRows.length; row++) {
                    const actualRow = browserRow + 2 + row;

                    // eCPM AdX column (deviceCol + 2)
                    const adxCell = sheet.getRange(actualRow, deviceCol + 2);
                    const adxVal = adxCell.getValue();
                    if (adxVal > 0) adxCell.setBackground('#b6d7a8');
                    else if (adxVal < 0) adxCell.setBackground('#ea9999');

                    // eCPM AdS column (deviceCol + 3)
                    const adsCell = sheet.getRange(actualRow, deviceCol + 3);
                    const adsVal = adsCell.getValue();
                    if (adsVal > 0) adsCell.setBackground('#b6d7a8');
                    else if (adsVal < 0) adsCell.setBackground('#ea9999');
                }
            }
        }
    }

    // -------------------------------------------------------
    // INVENTORY COVERAGE TABLE
    // Placed 1 column to the right of DEVICE COVERAGE table.
    // Reads from the "inventory" sheet and filters by month.
    // -------------------------------------------------------
    const inventoryCol = deviceCol + 5; // 1 column after device table (which spans 4 columns)

    // Get inventory data from the "inventory" sheet
    const inventorySheet = ss.getSheetByName('Inventory');
    if (inventorySheet) {
        const inventoryData = inventorySheet.getDataRange().getValues();
        const inventoryHeader = inventoryData[0];

        // Find column indices in inventory sheet
        const monthColIdx = inventoryHeader.indexOf('MONTH');
        const inventoryNameIdx = inventoryHeader.indexOf('INVENTORY_TYPE_NAME');
        const adxEcpmIdx = inventoryHeader.indexOf('ADX_ECPM');
        const adsEcpmIdx = inventoryHeader.indexOf('ADS_ECPM');
        const impressionsPctIdx = inventoryHeader.indexOf('IMPRESSIONS_PCT');
        const customDimensionIdx = inventoryHeader.indexOf('CUSTOM_DIMENSION');

        if (monthColIdx !== -1 && inventoryNameIdx !== -1 && adxEcpmIdx !== -1 &&
            adsEcpmIdx !== -1 && impressionsPctIdx !== -1 && customDimensionIdx !== -1) {

            // Extract year and month from monthKey (format: "2026-01")
            const targetYear = parseInt(monthKey.substring(0, 4), 10);
            const targetMonth = parseInt(monthKey.substring(5, 7), 10);

            // Determine which CUSTOM_DIMENSION to filter by based on sheet name
            const targetCustomDimension = sheetName.includes('PPID-only') ? '1' : '3';

            // Filter inventory data for this month
            const monthInventoryData = [];
            for (let i = 1; i < inventoryData.length; i++) {
                const row = inventoryData[i];
                const dateValue = row[monthColIdx];
                const customDimension = String(row[customDimensionIdx]);

                if (customDimension !== targetCustomDimension) continue;

                // Handle both native Date objects and date strings (e.g. "2026-01-01")
                let rowYear, rowMonth;
                if (dateValue instanceof Date) {
                    rowYear = dateValue.getFullYear();
                    rowMonth = dateValue.getMonth() + 1;
                } else {
                    const s = String(dateValue || '');
                    if (!/^\d{4}-\d{2}/.test(s)) continue;
                    rowYear = parseInt(s.substring(0, 4), 10);
                    rowMonth = parseInt(s.substring(5, 7), 10);
                }

                if (rowYear === targetYear && rowMonth === targetMonth) {
                    monthInventoryData.push({
                        inventory: row[inventoryNameIdx],
                        impressionsPct: Number(row[impressionsPctIdx]) || 0,
                        adxEcpm: Number(row[adxEcpmIdx]) || 0,
                        adsEcpm: Number(row[adsEcpmIdx]) || 0
                    });
                }
            }

            // Only create the table if we have inventory data for this month
            if (monthInventoryData.length > 0) {
                // Header row - merged across all 4 columns
                sheet.getRange(browserRow, inventoryCol, 1, 4).merge()
                    .setValue('INVENTORY COVERAGE')
                    .setHorizontalAlignment('center')
                    .setVerticalAlignment('middle')
                    .setFontWeight('bold')
                    .setBackground('#000000')
                    .setFontColor('#ffffff');

                // Column headers
                const inventoryHeaders = ['Inventory type', 'Impressions (%)', 'eCPM AdX', 'eCPM AdS'];
                sheet.getRange(browserRow + 1, inventoryCol, 1, 4).setValues([inventoryHeaders]);
                sheet.getRange(browserRow + 1, inventoryCol, 1, 4).setFontWeight('bold').setBackground('#f3f3f3');

                // Data rows
                const inventoryRows = monthInventoryData.map(d => [
                    d.inventory,
                    d.impressionsPct,
                    d.adxEcpm,
                    d.adsEcpm
                ]);

                sheet.getRange(browserRow + 2, inventoryCol, inventoryRows.length, 4).setValues(inventoryRows);

                // Number formatting
                // Impressions % column (inventoryCol + 1)
                sheet.getRange(browserRow + 2, inventoryCol + 1, inventoryRows.length, 1).setNumberFormat('0.00%');

                // eCPM columns (inventoryCol + 2 and inventoryCol + 3)
                sheet.getRange(browserRow + 2, inventoryCol + 2, inventoryRows.length, 2).setNumberFormat('#,##0.00');

                // Conditional formatting for eCPM columns
                for (let row = 0; row < inventoryRows.length; row++) {
                    const actualRow = browserRow + 2 + row;

                    // eCPM AdX column (inventoryCol + 2)
                    const adxCell = sheet.getRange(actualRow, inventoryCol + 2);
                    const adxVal = adxCell.getValue();
                    if (adxVal > 0) adxCell.setBackground('#b6d7a8');
                    else if (adxVal < 0) adxCell.setBackground('#ea9999');

                    // eCPM AdS column (inventoryCol + 3)
                    const adsCell = sheet.getRange(actualRow, inventoryCol + 3);
                    const adsVal = adsCell.getValue();
                    if (adsVal > 0) adsCell.setBackground('#b6d7a8');
                    else if (adsVal < 0) adsCell.setBackground('#ea9999');
                }
            }
        }
    }
}

// ============================================================
// YEAR SUMMARY SHEET
// A single cross-sheet overview for one year. Rows are grouped
// by month; each month has: a month-name row, an "Ad Exchange"
// row, an "Ad Server" row, and a "Total" row. Columns pull from
// the TOTAL row (row 4) of each monthly sheet using IFERROR so
// that months without data just show blank.
//
// SOURCE CELL MAP (all from row 4 of the monthly sheets):
//   Treatment Ad Requests  ADX  → col 4  (D)
//   Treatment Ad Requests  ADS  → col 20 (T)
//   Revenue Uplift         ADX  → col 17 (Q)
//   Revenue Uplift         ADS  → col 33 (AG)
//   Revenue %              ADX  → col 16 (P)
//   Revenue %              ADS  → col 32 (AF)
// ============================================================
function buildSummarySheet(ss, year, monthKeys) {
    // -------------------------------------------------------
    // SETUP
    // -------------------------------------------------------
    const sheetName = `${year} Summary`;
    let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.clearContents();
    // Clear any previous merged cells by clearing formatting too
    sheet.clearFormats();

    // -------------------------------------------------------
    // CONSTANTS
    // -------------------------------------------------------
    const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Row 1: global headers (year, "AD REQUESTS", "REVENUE UPLIFT", "RELATIVE UPLIFT")
    // Row 2: sub-headers  ("PPID-only", "PPID+PPS", "Total", ...)
    // Row 3 onward: data. Each month occupies exactly 4 rows:
    //   +0  Month name
    //   +1  Ad Exchange   <- formulas referencing monthly sheets
    //   +2  Ad Server     <- formulas referencing monthly sheets
    //   +3  Total         <- sums the two rows above
    const HEADER_ROWS = 2;
    const ROWS_PER_MONTH = 4;

    // -------------------------------------------------------
    // HEADER ROW 1 — global group headers
    // Col A: year (e.g. "2026")
    // Cols B-D: "AD REQUESTS"
    // Cols E-G: "REVENUE UPLIFT"
    // Cols H-I: "RELATIVE UPLIFT"
    // -------------------------------------------------------
    sheet.getRange(1, 1).setValue(year);
    sheet.getRange(1, 2).setValue('AD REQUESTS');
    sheet.getRange(1, 5).setValue('REVENUE UPLIFT');
    sheet.getRange(1, 8).setValue('RELATIVE UPLIFT');

    // Merge the global headers across their column spans
    sheet.getRange(1, 2, 1, 3).merge().setHorizontalAlignment('center');  // AD REQUESTS  B-D
    sheet.getRange(1, 5, 1, 3).merge().setHorizontalAlignment('center');  // REVENUE UPLIFT E-G
    sheet.getRange(1, 8, 1, 2).merge().setHorizontalAlignment('center');  // RELATIVE UPLIFT H-I

    // Style global headers — black background, white bold
    sheet.getRange(1, 1, 1, 9).setBackground('#000000').setFontColor('#ffffff').setFontWeight('bold');

    // Center "2026" within its cell
    sheet.getRange(1, 1).setHorizontalAlignment('center');

    // SOLID black vertical borders between global header groups,
    // running the full height of the sheet (row 1 through lastDataRow).
    // Applied cell-by-cell because row 1 contains merged cells —
    // a range-based border on a merged cell gets suppressed.
    // Separator columns: A (right), D (right), G (right), I (right — closing edge).
    const lastDataRow = HEADER_ROWS + (12 * ROWS_PER_MONTH);
    [1, 4, 7, 9].forEach(col => {
        for (let row = 1; row <= lastDataRow; row++) {
            sheet.getRange(row, col).setBorder(
                false, false, false, true, false, false,
                '#000000',
                SpreadsheetApp.BorderStyle.SOLID
            );
        }
    });

    // -------------------------------------------------------
    // HEADER ROW 2 — sub-column headers
    // -------------------------------------------------------
    const subHeaders = ['', 'PPID-only', 'PPID+PPS', 'Total', 'PPID-only', 'PPID+PPS', 'Total', 'PPID-only', 'PPID+PPS'];
    sheet.getRange(2, 1, 1, 9).setValues([subHeaders]);
    sheet.getRange(2, 1, 1, 9).setFontWeight('bold').setBackground('#f3f3f3');

    // -------------------------------------------------------
    // MONTH ROWS & FORMULAS
    // Iterates over all 12 months. For each month, writes the
    // month name, then Ad Exchange / Ad Server / Total rows
    // with formulas that pull from the corresponding monthly sheets.
    // -------------------------------------------------------
    for (let m = 0; m < 12; m++) {
        const abbr = MONTH_ABBR[m];                        // e.g. "Jan"
        const fullName = MONTH_FULL[m];                        // e.g. "January"
        const baseRow = HEADER_ROWS + 1 + (m * ROWS_PER_MONTH); // first row for this month
        const adxRow = baseRow + 1;                          // Ad Exchange row
        const adsRow = baseRow + 2;                          // Ad Server row
        const totalRow = baseRow + 3;                          // Total row

        // Sheet name fragments used in formulas (must be single-quoted if they contain special chars)
        // Include the year from the function parameter (e.g. "Jan 2026 - PPID-only")
        const ppidSheet = `'${abbr} ${year} - PPID-only'`;
        const ppsSheet = `'${abbr} ${year} - PPID+PPS'`;

        // --- Col A labels ---
        sheet.getRange(baseRow, 1).setValue(fullName);
        sheet.getRange(adxRow, 1).setValue('Ad Exchange');
        sheet.getRange(adsRow, 1).setValue('Ad Server');
        sheet.getRange(totalRow, 1).setValue('Total');

        // ---------------------------------------------------------
        // AD REQUESTS (cols B, C, D)
        // Source: Treatment Ad Requests
        //   ADX → col 4  on the monthly sheet TOTAL row (row 4)
        //   ADS → col 17 on the monthly sheet TOTAL row (row 4)
        // ---------------------------------------------------------
        // Ad Exchange row
        sheet.getRange(adxRow, 2).setFormula(`=IFERROR(${ppidSheet}!D4,"")`);   // PPID-only  ADX ad requests
        sheet.getRange(adxRow, 3).setFormula(`=IFERROR(${ppsSheet}!D4,"")`);    // PPID+PPS   ADX ad requests
        // Ad Server row
        sheet.getRange(adsRow, 2).setFormula(`=IFERROR(${ppidSheet}!T4,"")`);   // PPID-only  ADS ad requests  (col 17 = Q)
        sheet.getRange(adsRow, 3).setFormula(`=IFERROR(${ppsSheet}!T4,"")`);    // PPID+PPS   ADS ad requests
        // Total rows (sum Ad Exchange + Ad Server)
        sheet.getRange(totalRow, 2).setFormula(`=IF(AND(B${adxRow}="",B${adsRow}=""),"",B${adxRow}+B${adsRow})`);
        sheet.getRange(totalRow, 3).setFormula(`=IF(AND(C${adxRow}="",C${adsRow}=""),"",C${adxRow}+C${adsRow})`);
        // Total column D = PPID-only + PPID+PPS for each sub-row
        sheet.getRange(adxRow, 4).setFormula(`=IF(AND(B${adxRow}="",C${adxRow}=""),"",B${adxRow}+C${adxRow})`);
        sheet.getRange(adsRow, 4).setFormula(`=IF(AND(B${adsRow}="",C${adsRow}=""),"",B${adsRow}+C${adsRow})`);
        sheet.getRange(totalRow, 4).setFormula(`=IF(AND(D${adxRow}="",D${adsRow}=""),"",D${adxRow}+D${adsRow})`);

        // ---------------------------------------------------------
        // REVENUE UPLIFT (cols E, F, G)
        // Source: Revenue Uplift
        //   ADX → col 14 (N) on the monthly sheet TOTAL row (row 4)
        //   ADS → col 27 (AA) on the monthly sheet TOTAL row (row 4)
        // ---------------------------------------------------------
        // Ad Exchange row
        sheet.getRange(adxRow, 5).setFormula(`=IFERROR(${ppidSheet}!Q4,"")`);   // PPID-only  ADX revenue uplift
        sheet.getRange(adxRow, 6).setFormula(`=IFERROR(${ppsSheet}!Q4,"")`);    // PPID+PPS   ADX revenue uplift
        // Ad Server row
        sheet.getRange(adsRow, 5).setFormula(`=IFERROR(${ppidSheet}!AG4,"")`);  // PPID-only  ADS revenue uplift
        sheet.getRange(adsRow, 6).setFormula(`=IFERROR(${ppsSheet}!AG4,"")`);   // PPID+PPS   ADS revenue uplift
        // Total rows
        sheet.getRange(totalRow, 5).setFormula(`=IF(AND(E${adxRow}="",E${adsRow}=""),"",E${adxRow}+E${adsRow})`);
        sheet.getRange(totalRow, 6).setFormula(`=IF(AND(F${adxRow}="",F${adsRow}=""),"",F${adxRow}+F${adsRow})`);
        // Total column G = PPID-only + PPID+PPS
        sheet.getRange(adxRow, 7).setFormula(`=IF(AND(E${adxRow}="",F${adxRow}=""),"",E${adxRow}+F${adxRow})`);
        sheet.getRange(adsRow, 7).setFormula(`=IF(AND(E${adsRow}="",F${adsRow}=""),"",E${adsRow}+F${adsRow})`);
        sheet.getRange(totalRow, 7).setFormula(`=IF(AND(G${adxRow}="",G${adsRow}=""),"",G${adxRow}+G${adsRow})`);

        // ---------------------------------------------------------
        // RELATIVE UPLIFT (cols H, I) — no "Total" column here
        // Source: Revenue % Uplift
        //   ADX → col 16 (P) on the monthly sheet TOTAL row (row 4)
        //   ADS → col 32 (AF) on the monthly sheet TOTAL row (row 4)
        // ---------------------------------------------------------
        // Ad Exchange row
        sheet.getRange(adxRow, 8).setFormula(`=IFERROR(${ppidSheet}!P4,"")`);   // PPID-only  ADX revenue %
        sheet.getRange(adxRow, 9).setFormula(`=IFERROR(${ppsSheet}!P4,"")`);    // PPID+PPS   ADX revenue %
        // Ad Server row
        sheet.getRange(adsRow, 8).setFormula(`=IFERROR(${ppidSheet}!AF4,"")`);   // PPID-only  ADS revenue %
        sheet.getRange(adsRow, 9).setFormula(`=IFERROR(${ppsSheet}!AF4,"")`);    // PPID+PPS   ADS revenue %
        // Total row for relative uplift — Weighted Average of ADX and ADS
        // For PPID-only (Col 8/H): weighted by Col E (Revenue)
        sheet.getRange(totalRow, 8).setFormula(`=IFERROR(AVERAGE.WEIGHTED(H${adxRow}:H${adsRow}, E${adxRow}:E${adsRow}), "")`);

        // For PPID+PPS (Col 9/I): weighted by Col F (Revenue)
        sheet.getRange(totalRow, 9).setFormula(`=IFERROR(AVERAGE.WEIGHTED(I${adxRow}:I${adsRow}, F${adxRow}:F${adsRow}), "")`);

        // ---------------------------------------------------------
        // ROW STYLING
        // Month name row: bold, light grey background
        // Total row: bold
        // ---------------------------------------------------------
        sheet.getRange(baseRow, 1, 1, 9).setFontWeight('bold').setBackground('#b6d7a8');
        sheet.getRange(totalRow, 1, 1, 9).setFontWeight('bold');
    }

    // -------------------------------------------------------
    // NUMBER FORMATTING
    // AD REQUESTS (cols B-D): integer with commas
    // REVENUE UPLIFT (cols E-G): currency, no symbol
    // RELATIVE UPLIFT (cols H-I): percentage
    // Applied from the first data row through the last month's Total row.
    // -------------------------------------------------------
    const firstDataRow = HEADER_ROWS + 1;
    // lastDataRow already declared above in the vertical borders block.

    // Integer formatting — Ad Requests
    sheet.getRange(firstDataRow, 2, lastDataRow - firstDataRow + 1, 3).setNumberFormat('#,##0');
    // Currency formatting — Revenue Uplift (no symbol)
    sheet.getRange(firstDataRow, 5, lastDataRow - firstDataRow + 1, 3).setNumberFormat('#,##0.00');
    // Percentage formatting — Relative Uplift
    sheet.getRange(firstDataRow, 8, lastDataRow - firstDataRow + 1, 2).setNumberFormat('0.00%');

    // -------------------------------------------------------
    // BORDERS — monthly horizontal separators
    // Solid black border on the bottom of each month's "Total"
    // row. After applying the horizontal border across all 9
    // columns, the intersection cells (cols 1, 4, 7) get both
    // bottom AND right set together so the vertical borders
    // from the header-group separators are preserved.
    // -------------------------------------------------------
    for (let m = 0; m < 12; m++) {
        const totalRow = HEADER_ROWS + 1 + (m * ROWS_PER_MONTH) + 3;

        // Horizontal border across the full row.
        sheet.getRange(totalRow, 1, 1, 9).setBorder(
            false, false, true, false, false, false,
            '#000000',
            SpreadsheetApp.BorderStyle.SOLID
        );

        // Re-apply bottom + right on the four intersection cells
        // so the vertical separators survive the horizontal pass.
        [1, 4, 7, 9].forEach(col => {
            sheet.getRange(totalRow, col).setBorder(
                false, false, true, true, false, false,
                '#000000',
                SpreadsheetApp.BorderStyle.SOLID
            );
        });
    }

    // -------------------------------------------------------
    // FREEZE & COLUMN WIDTHS
    // Freeze the 2 header rows so they stay visible while
    // scrolling. Widen col A to fit month names.
    // -------------------------------------------------------
    sheet.setFrozenRows(2);
    sheet.setColumnWidth(1, 120);  // Col A — month / label names
}