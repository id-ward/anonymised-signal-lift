// @ts-nocheck
/**
 * ==================================================================================
 * PPID LIFT METHODOLOGY - FINAL REVISED VERSION (WEIGHTED AVG SUMMARY)
 * ==================================================================================
 */

function buildPPIDLiftReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheets()[0];

  const header = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  const safeColIndex = (name) => {
    const idx = header.indexOf(name);
    return idx === -1 ? null : idx;
  };

  const DATE_COL              = safeColIndex('dt');
  const DEMAND_CHANNEL_COL    = safeColIndex('DEMAND_CHANNEL');
  const PPID_STATUS_COL       = safeColIndex('PPID_STATUS_NAME');
  const ADX_REV_COL           = safeColIndex('adx_revenue');
  const ADS_REV_COL           = safeColIndex('ads_revenue');
  const AD_REQUESTS_COL       = safeColIndex('ad_requests');
  const ANON_ADX_REQ_COL      = safeColIndex('ANON_ADX_TOTAL_REQUESTS');
  const ANON_ADS_IMP_COL      = safeColIndex('ANON_ADS_IMPRESSIONS');
  const ANON_ADS_UNFILLED_COL = safeColIndex('ANON_ADS_UNFILLED_IMPRESSIONS');
  const PPID_PASS_RATE_COL    = safeColIndex('ppid_passing_rate');

  if (DATE_COL === null || DEMAND_CHANNEL_COL === null || PPID_STATUS_COL === null) {
    const outputSheet = ss.getSheetByName('Error Log') || ss.insertSheet('Error Log');
    outputSheet.clear().getRange(1, 1).setValue('ERROR: Missing required columns.');
    return;
  }

  const lastRow = sourceSheet.getLastRow();
  const lastCol = sourceSheet.getLastColumn();
  const CHUNK_SIZE = 2000;

  const treatmentData = { adx: {}, ads: {} };
  const controlData   = { adx: {}, ads: {} };
  const anonData      = {}; 

  const ensureDateKey = (v) =>
    v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v);

  const addToMap = (map, d, r, a) => {
    if (!map[d]) map[d] = { revenue: 0, adRequests: 0 };
    map[d].revenue += Number(r) || 0;
    map[d].adRequests += Number(a) || 0;
  };

  // -------------------------------------------------------
  // DATA ACCUMULATION
  // -------------------------------------------------------
  for (let start = 2; start <= lastRow; start += CHUNK_SIZE) {
    const rows = sourceSheet.getRange(start, 1, Math.min(CHUNK_SIZE, lastRow - start + 1), lastCol).getValues();

    rows.forEach(r => {
      const ppidStatus = String(r[PPID_STATUS_COL] || '').trim();
      const demand     = String(r[DEMAND_CHANNEL_COL] || '').trim();
      const date       = ensureDateKey(r[DATE_COL]);
      
      if (demand !== 'AD_EXCHANGE' && demand !== 'AD_SERVER') return;

      if (!anonData[date]) {
        anonData[date] = { adxBase: 0, adsBase: 0, adxRate: 0, adsRate: 0 };
      }

      if (ppidStatus === 'Active') {
        if (demand === 'AD_EXCHANGE') {
          anonData[date].adxBase = Number(r[ANON_ADX_REQ_COL]) || 0;
          anonData[date].adxRate = Number(r[PPID_PASS_RATE_COL]) || 0;
        } else if (demand === 'AD_SERVER') {
          anonData[date].adsBase = (Number(r[ANON_ADS_IMP_COL]) || 0) + (Number(r[ANON_ADS_UNFILLED_COL]) || 0);
          anonData[date].adsRate = Number(r[PPID_PASS_RATE_COL]) || 0;
        }
      }

      const rev  = demand === 'AD_EXCHANGE' ? r[ADX_REV_COL] || 0 : r[ADS_REV_COL] || 0;
      const reqs = r[AD_REQUESTS_COL] || 0;
      const ch   = demand === 'AD_EXCHANGE' ? 'adx' : 'ads';

      if (ppidStatus === 'Active') addToMap(treatmentData[ch], date, rev, reqs);
      if (ppidStatus === 'Missing') addToMap(controlData[ch], date, rev, reqs);
    });
  }

  const monthBuckets = {};
  const allDates = new Set([...Object.keys(treatmentData.adx), ...Object.keys(treatmentData.ads), ...Object.keys(anonData)]);
  allDates.forEach(dk => {
    const m = dk.substring(0, 7);
    if (!monthBuckets[m]) monthBuckets[m] = new Set();
    monthBuckets[m].add(dk);
  });

  const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  Object.keys(monthBuckets).sort().forEach(monthKey => {
    const prefix = MONTH_ABBR[parseInt(monthKey.substring(5, 7)) - 1];
    const filter = (obj) => {
      const res = { adx: {}, ads: {} };
      ['adx', 'ads'].forEach(ch => {
        Object.keys(obj[ch]).forEach(dk => { if(dk.startsWith(monthKey)) res[ch][dk] = obj[ch][dk]; });
      });
      return res;
    };
    generateOutput(ss, `${prefix} - PPID Lift`, filter(treatmentData), filter(controlData), anonData, monthKey);
  });

  buildSummarySheet(ss);
}

// ============================================================
// MONTHLY OUTPUT GENERATOR
// ============================================================
function generateOutput(ss, sheetName, treatment, control, anonData, monthKey) {
  let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheet.clear();

  const year  = parseInt(monthKey.substring(0, 4));
  const month = parseInt(monthKey.substring(5, 7)) - 1;
  const lastDay = new Date(year, month + 1, 0).getDate();

  const rows = [];
  for (let d = 1; d <= lastDay; d++) {
    const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const tAdx = treatment.adx[dateKey] || { revenue: 0, adRequests: 0 };
    const cAdx = control.adx[dateKey]   || { revenue: 0, adRequests: 0 };
    const tAds = treatment.ads[dateKey] || { revenue: 0, adRequests: 0 };
    const cAds = control.ads[dateKey]   || { revenue: 0, adRequests: 0 };
    const anon = anonData[dateKey]      || { adxBase: 0, adsBase: 0, adxRate: 0, adsRate: 0 };

    const tAdxEcpm = tAdx.adRequests > 0 ? (tAdx.revenue / tAdx.adRequests) * 1000 : 0;
    const cAdxEcpm = cAdx.adRequests > 0 ? (cAdx.revenue / cAdx.adRequests) * 1000 : 0;
    const adxUpliftEcpm = tAdxEcpm - cAdxEcpm;
    const activeAnonAdx = anon.adxBase * anon.adxRate;
    const adxRevUplift = (activeAnonAdx * adxUpliftEcpm) / 1000;

    const tAdsEcpm = tAds.adRequests > 0 ? (tAds.revenue / tAds.adRequests) * 1000 : 0;
    const cAdsEcpm = cAds.adRequests > 0 ? (cAds.revenue / cAds.adRequests) * 1000 : 0;
    const adsUpliftEcpm = tAdsEcpm - cAdsEcpm;
    const activeAnonAds = anon.adsBase * anon.adsRate;
    const adsRevUplift = (activeAnonAds * adsUpliftEcpm) / 1000;

    rows.push([
      dateKey, Math.max(anon.adxRate, anon.adsRate),
      tAdx.revenue, tAdx.adRequests, tAdxEcpm, cAdx.revenue, cAdx.adRequests, cAdxEcpm, adxUpliftEcpm, (cAdxEcpm ? adxUpliftEcpm/cAdxEcpm : 0), activeAnonAdx, adxRevUplift,
      tAds.revenue, tAds.adRequests, tAdsEcpm, cAds.revenue, cAds.adRequests, cAdsEcpm, adsUpliftEcpm, (cAdsEcpm ? adsUpliftEcpm/cAdsEcpm : 0), activeAnonAds, adsRevUplift
    ]);
  }

  const h1 = ['DATE', 'PPID PASSING RATE', 'AD EXCHANGE','','','','','','','','','', 'AD SERVER','','','','','','','','',''];
  const h2 = ['', '', 'TREATMENT GROUP','','', 'CONTROL GROUP','','', 'UPLIFT','','','', 'TREATMENT GROUP','','', 'CONTROL GROUP','','', 'UPLIFT','','',''];
  const h3 = ['', '', 'Revenue','Ad Requests','eCPM', 'Revenue','Ad Requests','eCPM', 'eCPM Uplift','eCPM % Uplift','Active Anon Req','Rev Uplift', 'Revenue','Ad Requests','eCPM', 'Revenue','Ad Requests','eCPM', 'eCPM Uplift','eCPM % Uplift','Active Anon Req','Rev Uplift'];
  
  sheet.getRange(1, 1, 3, 22).setValues([h1, h2, h3]).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(1, 1, 3, 1).merge();
  sheet.getRange(1, 2, 3, 1).merge().setBackground('#fff2cc');
  sheet.getRange(1, 3, 1, 10).merge().setBackground('#5f6368').setFontColor('#ffffff');
  sheet.getRange(1, 13, 1, 10).merge().setBackground('#5f6368').setFontColor('#ffffff');
  [3, 13].forEach(c => sheet.getRange(2, c, 1, 3).merge().setBackground('#b6d7a8'));
  [6, 16].forEach(c => sheet.getRange(2, c, 1, 3).merge().setBackground('#ea9999'));
  [9, 19].forEach(c => sheet.getRange(2, c, 1, 4).merge().setBackground('#9fc5e8'));

  const totalsRow = 4;
  const dataStart = 5;
  sheet.getRange(dataStart, 1, rows.length, 22).setValues(rows);
  sheet.getRange(totalsRow, 1).setValue('TOTAL').setFontWeight('bold');
  
  // FIX: Added index 13 (Ad Server Treatment Revenue) to the SUM loop
  [3, 4, 6, 7, 11, 12, 13, 14, 16, 17, 21, 22].forEach(c => sheet.getRange(totalsRow, c).setFormulaR1C1(`=SUM(R[1]C:R[${rows.length}]C)`));
  [2, 5, 8, 9, 10, 15, 18, 19, 20].forEach(c => sheet.getRange(totalsRow, c).setFormulaR1C1(`=AVERAGE(R[1]C:R[${rows.length}]C)`));
  sheet.getRange(totalsRow, 1, 1, 22).setFontWeight('bold').setBackground('#f3f3f3');

  sheet.getRange(1, 1, dataStart + rows.length, 22).setWrap(false);
  sheet.setFrozenRows(4);
  sheet.setFrozenColumns(1);
  sheet.autoResizeColumns(1, 22);
  for (let i = 1; i <= 22; i++) {
    sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 25);
  }

  sheet.getRange(4, 1, 1, 22).setBorder(null, null, true, null, null, null, 'black', SpreadsheetApp.BorderStyle.SOLID_THICK);
  sheet.getRange(4, 2, rows.length + 1, 1).setNumberFormat('0.00%');
  const curr = [3, 5, 6, 8, 9, 12, 13, 15, 16, 18, 19, 22];
  curr.forEach(c => sheet.getRange(4, c, rows.length + 1, 1).setNumberFormat('£#,##0.00'));
  [10, 20].forEach(c => sheet.getRange(4, c, rows.length + 1, 1).setNumberFormat('0.00%'));
  [4, 7, 11, 14, 17, 21].forEach(c => sheet.getRange(4, c, rows.length + 1, 1).setNumberFormat('#,##0'));

  const sRow = dataStart + rows.length + 2;
  sheet.getRange(sRow, 4, 4, 2).setValues([['REVENUE UPLIFT', ''], ['Ad Exchange', `=L${totalsRow}`], ['Ad Server', `=V${totalsRow}`], ['Total', `=L${totalsRow}+V${totalsRow}`]]);
  sheet.getRange(sRow, 4, 1, 2).merge().setBackground('#000000').setFontColor('#ffffff').setFontWeight('bold');
  sheet.getRange(sRow + 3, 4, 1, 2).setFontWeight('bold');
  sheet.getRange(sRow + 1, 5, 3, 1).setNumberFormat('£#,##0.00');
}

// ============================================================
// SUMMARY SHEET GENERATOR
// ============================================================
function buildSummarySheet(ss) {
  const sheetName = '2026 Summary';
  let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheet.clear();

  const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTH_FULL = ['January','February','March','April','May','June', 'July','August','September','October','November','December'];

  sheet.getRange(1, 1).setValue('2026').setFontWeight('bold');
  sheet.getRange(1, 2).setValue('AD REQUESTS');
  sheet.getRange(1, 3).setValue('REVENUE UPLIFT');
  sheet.getRange(1, 4).setValue('RELATIVE UPLIFT');
  sheet.getRange(1, 2, 1, 3).setBackground('#000000').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');

  for (let m = 0; m < 12; m++) {
    const baseRow = 2 + (m * 4);
    const abbr = MONTH_ABBR[m];
    const sRef = `'${abbr} - PPID Lift'`;

    sheet.getRange(baseRow, 1, 1, 4).setBackground('#b6d7a8').setFontWeight('bold');
    sheet.getRange(baseRow, 1).setValue(MONTH_FULL[m]);

    sheet.getRange(baseRow + 1, 1, 3, 1).setValues([['Ad Exchange'], ['Ad Server'], ['Total']]);
    sheet.getRange(baseRow + 3, 1).setFontWeight('bold');

    // AD REQUESTS: Monthly Col K (11) and U (21)
    sheet.getRange(baseRow + 1, 2).setFormula(`=IFERROR(${sRef}!K4, 0)`);
    sheet.getRange(baseRow + 2, 2).setFormula(`=IFERROR(${sRef}!U4, 0)`);
    sheet.getRange(baseRow + 3, 2).setFormula(`=B${baseRow+1}+B${baseRow+2}`).setFontWeight('bold');

    // REVENUE UPLIFT: Monthly Col L (12) and V (22)
    sheet.getRange(baseRow + 1, 3).setFormula(`=IFERROR(${sRef}!L4, 0)`);
    sheet.getRange(baseRow + 2, 3).setFormula(`=IFERROR(${sRef}!V4, 0)`);
    sheet.getRange(baseRow + 3, 3).setFormula(`=C${baseRow+1}+C${baseRow+2}`).setFontWeight('bold');

    // RELATIVE UPLIFT (eCPM % Uplift from monthly Col J and T)
    sheet.getRange(baseRow + 1, 4).setFormula(`=IFERROR(${sRef}!J4, 0)`);
    sheet.getRange(baseRow + 2, 4).setFormula(`=IFERROR(${sRef}!T4, 0)`);
    
    // FIX: Weighted average based on Ad Requests for the month
    sheet.getRange(baseRow + 3, 4).setFormula(`=IF(B${baseRow+3}>0, (B${baseRow+1}*D${baseRow+1} + B${baseRow+2}*D${baseRow+2})/B${baseRow+3}, 0)`).setFontWeight('bold');

    sheet.getRange(baseRow, 1, 4, 4).setBorder(true, true, true, true, null, null, 'black', SpreadsheetApp.BorderStyle.SOLID);
  }

  sheet.getRange(1, 1, 50, 4).setWrap(false).setVerticalAlignment('middle');
  sheet.autoResizeColumns(1, 4);
  for (let i = 1; i <= 4; i++) {
    sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 30);
  }

  sheet.getRange(2, 2, 48, 1).setNumberFormat('#,##0');
  sheet.getRange(2, 3, 48, 1).setNumberFormat('£#,##0.00');
  sheet.getRange(2, 4, 48, 1).setNumberFormat('0.00%');
}
