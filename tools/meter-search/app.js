(function(){
  document.getElementById('todayStamp').textContent = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  var workbook = null;
  var currentSheetName = null;
  var rows = [];          // array of row objects for the active sheet
  var columns = [];       // ordered column headers for the active sheet
  var lastResults = [];   // rows currently shown / exportable
  var lastFileName = 'register';
  var lastMeterCol = '';
  var lastSubCol = '';

  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('fileInput');
  var fileSummary = document.getElementById('fileSummary');
  var sheetPicker = document.getElementById('sheetPicker');
  var sheetPickerWrap = document.getElementById('sheetPickerWrap');
  var searchPanel = document.getElementById('searchPanel');
  var resultsPanel = document.getElementById('resultsPanel');
  var meterColSelect = document.getElementById('meterColSelect');
  var substationColSelect = document.getElementById('substationColSelect');
  var tableWrap = document.getElementById('tableWrap');
  var statusLine = document.getElementById('statusLine');
  var missingListWrap = document.getElementById('missingListWrap');
  var exportBtn = document.getElementById('exportBtn');
  var exportJobBtn = document.getElementById('exportJobBtn');

  dropzone.addEventListener('click', function(){ fileInput.click(); });
  dropzone.addEventListener('dragover', function(e){ e.preventDefault(); dropzone.classList.add('drag'); });
  dropzone.addEventListener('dragleave', function(){ dropzone.classList.remove('drag'); });
  dropzone.addEventListener('drop', function(e){
    e.preventDefault();
    dropzone.classList.remove('drag');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function(e){
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  });
  document.getElementById('changeFileBtn').addEventListener('click', function(){
    fileInput.value = '';
    fileInput.click();
  });

  function handleFile(file){
    lastFileName = file.name.replace(/\.[^.]+$/, '') || 'register';
    var reader = new FileReader();
    reader.onload = function(e){
      try{
        var data = new Uint8Array(e.target.result);
        workbook = XLSX.read(data, { type: 'array', cellDates: true });
        populateSheetPicker();
        var firstUsable = findFirstNonEmptySheet();
        loadSheet(firstUsable);
        document.getElementById('statFileName').textContent = file.name;
        fileSummary.style.display = 'block';
        searchPanel.style.display = 'block';
        resultsPanel.style.display = 'block';
      }catch(err){
        alert('Could not read this file. Please check it is a valid .xlsx, .xls, .xlsb or .csv file.\n\n' + err.message);
      }
    };
    reader.onerror = function(){
      alert('There was a problem reading the file. Please try again.');
    };
    reader.readAsArrayBuffer(file);
  }

  function populateSheetPicker(){
    sheetPicker.innerHTML = '';
    workbook.SheetNames.forEach(function(name){
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sheetPicker.appendChild(opt);
    });
    sheetPickerWrap.style.display = workbook.SheetNames.length > 1 ? 'block' : 'none';
  }

  function findFirstNonEmptySheet(){
    for (var i = 0; i < workbook.SheetNames.length; i++){
      var name = workbook.SheetNames[i];
      var ws = workbook.Sheets[name];
      var data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (data.length > 0) return name;
    }
    return workbook.SheetNames[0];
  }

  sheetPicker.addEventListener('change', function(){ loadSheet(sheetPicker.value); });

  function loadSheet(sheetName){
    currentSheetName = sheetName;
    sheetPicker.value = sheetName;
    var ws = workbook.Sheets[sheetName];
    var json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });

    columns = [];
    var seen = {};
    json.forEach(function(r){
      Object.keys(r).forEach(function(k){
        if (!seen[k]){ seen[k] = true; columns.push(k); }
      });
    });

    rows = json.map(function(r){
      var clean = {};
      columns.forEach(function(c){
        clean[c] = formatCellForDisplay(r[c]);
      });
      return clean;
    });

    document.getElementById('statSheet').textContent = sheetName;
    document.getElementById('statRows').textContent = rows.length;
    document.getElementById('statCols').textContent = columns.length;

    populateColumnSelectors();
    clearResults();
  }

  function formatCellForDisplay(v){
    if (v instanceof Date){
      if (isNaN(v.getTime())) return '';
      var dd = String(v.getDate()).padStart(2,'0');
      var mm = String(v.getMonth()+1).padStart(2,'0');
      var yyyy = v.getFullYear();
      return dd + '-' + mm + '-' + yyyy;
    }
    if (v === null || v === undefined) return '';
    return v;
  }

  function guessColumn(candidates){
    var lowerCols = columns.map(function(c){ return String(c).toLowerCase(); });
    for (var i = 0; i < candidates.length; i++){
      var idx = lowerCols.findIndex(function(c){ return c.indexOf(candidates[i]) !== -1; });
      if (idx !== -1) return columns[idx];
    }
    return columns[0] || '';
  }

  function populateColumnSelectors(){
    [meterColSelect, substationColSelect].forEach(function(sel){
      sel.innerHTML = '';
      columns.forEach(function(c){
        var opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        sel.appendChild(opt);
      });
    });
    meterColSelect.value = guessColumn(['meter sr', 'meter serial', 'meter no', 'srno', 'sr. no']);
    substationColSelect.value = guessColumn(['substation name', 'substation']);
  }

  function parsePastedValues(text){
    return text
      .split(/[\r\n,;]+/)
      .map(function(s){ return s.trim(); })
      .filter(function(s){ return s.length > 0; });
  }

  document.getElementById('searchBtn').addEventListener('click', runSearch);
  document.getElementById('clearBtn').addEventListener('click', function(){
    document.getElementById('searchInput').value = '';
    clearResults();
  });

  function getFieldMode(){
    var checked = document.querySelector('input[name="fieldMode"]:checked');
    return checked ? checked.value : 'meter';
  }

  function runSearch(){
    var raw = document.getElementById('searchInput').value;
    var terms = parsePastedValues(raw);
    if (terms.length === 0){
      clearResults();
      return;
    }
    var mode = getFieldMode();
    var meterCol = meterColSelect.value;
    var subCol = substationColSelect.value;

    var termSet = {};
    terms.forEach(function(t){ termSet[t.toLowerCase()] = true; });

    var matchedRows = [];
    var foundTerms = {};

    rows.forEach(function(r){
      var meterVal = String(r[meterCol] !== undefined ? r[meterCol] : '').trim();
      var subVal = String(r[subCol] !== undefined ? r[subCol] : '').trim();
      var isMatch = false;
      var matchedOn = [];

      if (mode === 'meter' || mode === 'both'){
        if (termSet[meterVal.toLowerCase()]){ isMatch = true; foundTerms[meterVal.toLowerCase()] = true; }
      }
      if (mode === 'substation' || mode === 'both'){
        if (termSet[subVal.toLowerCase()]){ isMatch = true; foundTerms[subVal.toLowerCase()] = true; }
      }
      if (isMatch) matchedRows.push(r);
    });

    var missing = terms.filter(function(t){ return !foundTerms[t.toLowerCase()]; });

    lastResults = matchedRows;
    renderResults(matchedRows, terms, missing, mode, meterCol, subCol);
  }

  function clearResults(){
    lastResults = [];
    statusLine.innerHTML = '';
    missingListWrap.innerHTML = '';
    tableWrap.innerHTML = '<div class="empty-state">Run a search to see matching rows here.</div>';
    exportBtn.disabled = true;
    exportJobBtn.disabled = true;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  function highlight(value, terms){
    var text = escapeHtml(value);
    var lower = String(value).toLowerCase();
    for (var i = 0; i < terms.length; i++){
      if (lower === terms[i].toLowerCase()){
        return '<mark>' + text + '</mark>';
      }
    }
    return text;
  }

  function renderResults(matchedRows, terms, missing, mode, meterCol, subCol){
    var foundCount = terms.length - missing.length;
    statusLine.innerHTML =
      '<span class="pill total">' + terms.length + ' value' + (terms.length === 1 ? '' : 's') + ' searched</span>' +
      '<span class="pill found">' + foundCount + ' matched</span>' +
      (missing.length ? '<span class="pill missing">' + missing.length + ' not found</span>' : '') +
      '<span class="pill total">' + matchedRows.length + ' row' + (matchedRows.length === 1 ? '' : 's') + ' returned</span>';

    if (missing.length){
      missingListWrap.innerHTML = '<div class="missing-list"><b>Not found:</b> ' + missing.map(escapeHtml).join(', ') + '</div>';
    } else {
      missingListWrap.innerHTML = '';
    }

    if (matchedRows.length === 0){
      tableWrap.innerHTML = '<div class="empty-state">No rows matched the values you pasted.</div>';
      exportBtn.disabled = true;
      exportJobBtn.disabled = true;
      return;
    }

    var html = '<table><thead><tr>';
    columns.forEach(function(c){ html += '<th>' + escapeHtml(c) + '</th>'; });
    html += '</tr></thead><tbody>';

    matchedRows.forEach(function(r){
      html += '<tr>';
      columns.forEach(function(c){
        var val = r[c];
        var cellClass = '';
        if (String(val).toUpperCase() === 'AMR') cellClass = 'status-amr';
        else if (String(val).toUpperCase() === 'NONAMR') cellClass = 'status-nonamr';
        var content;
        if (c === meterCol && (mode === 'meter' || mode === 'both')) content = highlight(val, terms);
        else if (c === subCol && (mode === 'substation' || mode === 'both')) content = highlight(val, terms);
        else content = escapeHtml(val);
        html += '<td class="' + cellClass + '">' + content + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    tableWrap.innerHTML = html;
    exportBtn.disabled = false;
    exportJobBtn.disabled = false;
    lastMeterCol = meterCol;
    lastSubCol = subCol;
  }

  exportBtn.addEventListener('click', function(){
    if (!lastResults.length) return;
    var ws = XLSX.utils.json_to_sheet(lastResults, { header: columns });
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Search results');
    var stamp = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, lastFileName + '_search_results_' + stamp + '.xlsx');
  });

  exportJobBtn.addEventListener('click', function(){
    if (!lastResults.length) return;
    var jobRows = lastResults.map(function(r, i){
      return {
        'SrNo.': i + 1,
        'Meter No.': r[lastMeterCol] !== undefined ? r[lastMeterCol] : '',
        'Substation': r[lastSubCol] !== undefined ? r[lastSubCol] : '',
        'Job Id': ''
      };
    });
    var ws = XLSX.utils.json_to_sheet(jobRows, { header: ['SrNo.', 'Meter No.', 'Substation', 'Job Id'] });
    ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 30 }, { wch: 16 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Job assignment');
    var stamp = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, lastFileName + '_job_assignment_' + stamp + '.xlsx');
  });

})();
