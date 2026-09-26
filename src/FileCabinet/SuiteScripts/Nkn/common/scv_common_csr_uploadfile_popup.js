/**
 * Nội dung:
 * + Popup upload file dùng chung cho các client script (drag & drop, xls/xlsx/csv)
 * + Excel đọc bằng ExcelJS (đã include sẵn qua constForm)
 * + Cách dùng:
 *      popupUploadFile.showPopup({
 *          title: "Upload File",                       // optional
 *          accept: [".xlsx", ".csv"],                  // optional
 *          columns: [{id, label, type}],               // map header/thứ tự cột -> object line
 *          columnDelimiter: "comma",                   // optional (comma | semicolon | tab | pipe)
 *          decimalDelimiter: "period",                 // optional (period | comma)
 *          onUpload: (arrLines, objFileInfo) => {}     // objFileInfo = {name, size, totalLine}
 *      });
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  27 Aug 2026         Huy Pham                Init, create file, PMP_WBS Import, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d453pe8)
 */
/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define([], () => {
    const Stores = {
        ColumnDelimiter: {
            Comma: {ID: "comma", NAME: "Comma (,)", VALUE: ","},
            Semicolon: {ID: "semicolon", NAME: "Semicolon (;)", VALUE: ";"},
            Tab: {ID: "tab", NAME: "Tab", VALUE: "\t"},
            Pipe: {ID: "pipe", NAME: "Pipe (|)", VALUE: "|"},
        },
        DecimalDelimiter: {
            Period: {ID: "period", NAME: "Period (.)", VALUE: "."},
            Comma: {ID: "comma", NAME: "Comma (,)", VALUE: ","},
        },
    };

    const Popup = {
        WIN_NAME: "popupUploadFile",
        Default: {
            TITLE: "Upload File",
            ACCEPT: [".xls", ".xlsx", ".csv"],
            //TO-DO: lấy default từ config/user preferences
            COLUMN_DELIMITER: Stores.ColumnDelimiter.Comma.ID,
            DECIMAL_DELIMITER: Stores.DecimalDelimiter.Period.ID,
        },
    };

    let State = {};

    const showPopup = (_options) =>{
        State = {
            options: {
                title: _options?.title ?? Popup.Default.TITLE,
                accept: _options?.accept ?? Popup.Default.ACCEPT,
                columns: _options?.columns ?? [],
                columnDelimiter: _options?.columnDelimiter ?? Popup.Default.COLUMN_DELIMITER,
                decimalDelimiter: _options?.decimalDelimiter ?? Popup.Default.DECIMAL_DELIMITER,
                onUpload: _options?.onUpload,
            },
            win: null,
            file: null,
            fileType: "", // excel | csv
            textContent: "",
            rows: [],
            totalLine: 0,
        };

        let htmlContent = `
            <style>
                #scvUploadFile *{ box-sizing: border-box; }
                .scv-upload-dropzone{
                    border: 2px dashed #1e88e5; border-radius: 8px;
                    background: #f5faff; color: #1565c0;
                    padding: 26px 14px; text-align: center; cursor: pointer;
                    transition: background .15s, border-color .15s;
                }
                .scv-upload-dropzone:hover, .scv-upload-dropzone.scv-dragover{
                    background: #e3f2fd; border-color: #1565c0;
                }
                .scv-upload-dropzone-text{ font-size: 13px; font-weight: 600; margin-top: 8px; }
                .scv-upload-dropzone-hint{ font-size: 11px; color: #5c86b5; margin-top: 4px; }
                .scv-upload-browse{ color: #1e88e5; text-decoration: underline; font-weight: 600; }
                .scv-upload-fileinfo{
                    display: flex; align-items: center; gap: 10px;
                    margin-top: 12px; padding: 10px 12px;
                    background: #e3f2fd; border: 1px solid #90caf9; border-radius: 6px;
                }
                .scv-upload-fileinfo-detail{ flex: 1; min-width: 0; }
                .scv-upload-fileinfo-name{
                    font-size: 12px; font-weight: 600; color: #0d47a1;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .scv-upload-fileinfo-meta{ font-size: 11px; color: #4b79a9; margin-top: 2px; }
                .scv-upload-fileinfo-remove{
                    border: none; background: none; color: #d32f2f; font-size: 16px;
                    cursor: pointer; padding: 2px 6px; line-height: 1;
                }
                .scv-upload-actions{ display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
                .scv-upload-btn{
                    border-radius: 4px; padding: 7px 20px; cursor: pointer; font-weight: 600; font-size: 12px;
                }
                .scv-upload-btn-primary{ background: #1e88e5; color: #fff; border: 1px solid #1e88e5; }
                .scv-upload-btn-primary:hover:not(:disabled){ background: #1565c0; border-color: #1565c0; }
                .scv-upload-btn-primary:disabled{ background: #9dc5ee; border-color: #9dc5ee; cursor: not-allowed; }
                .scv-upload-btn-secondary{ background: #fff; color: #1e88e5; border: 1px solid #90caf9; }
                .scv-upload-btn-secondary:hover{ background: #e3f2fd; }
            </style>
            <div id="scvUploadDropZone" class="scv-upload-dropzone">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/>
                    <path d="M12 12v9"/>
                    <path d="m8 16 4-4 4 4"/>
                </svg>
                <div class="scv-upload-dropzone-text">Drag &amp; drop file here</div>
                <div class="scv-upload-dropzone-hint">or <span class="scv-upload-browse">browse</span> from your computer</div>
                <div class="scv-upload-dropzone-hint">Supported: ${State.options.accept.join(", ")}</div>
            </div>
            <input type="file" id="scvUploadFileInput" accept="${State.options.accept.join(",")}" style="display: none;" />
            <div id="scvUploadFileInfo" class="scv-upload-fileinfo" style="display: none;">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1565c0" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <path d="M14 2v6h6"/>
                </svg>
                <div class="scv-upload-fileinfo-detail">
                    <div class="scv-upload-fileinfo-name" id="scvUploadFileName"></div>
                    <div class="scv-upload-fileinfo-meta"><span id="scvUploadFileSize"></span> &bull; <span id="scvUploadFileTotalLine"></span></div>
                </div>
                <button type="button" id="scvUploadFileRemove" class="scv-upload-fileinfo-remove" title="Remove file">&times;</button>
            </div>
            <div class="scv-upload-actions">
                <button type="button" id="scvUploadBtnCancel" class="scv-upload-btn scv-upload-btn-secondary">Cancel</button>
                <button type="button" id="scvUploadBtnUpload" class="scv-upload-btn scv-upload-btn-primary" disabled>Upload</button>
            </div>
        `;

        State.win = nlExtOpenDivWindow(Popup.WIN_NAME, 480, 400, undefined, true, State.options.title, null,
            `<div class="container-fluid"><div id="scvUploadFile" style="padding: 10px">${htmlContent}</div></div>`);

        window._scvInitPopupUploadFile = () =>{
            if(!document.querySelector("#scvUploadDropZone")){
                setTimeout(() => window._scvInitPopupUploadFile(), 100);
                return;
            }

            jQuery(`#${Popup.WIN_NAME}_frame`).css({'overflow': 'auto'});

            let dropZone = jQuery("#scvUploadDropZone");
            let fileInput = jQuery("#scvUploadFileInput");

            dropZone.off().on("click", () => fileInput.trigger("click"));

            dropZone.on("dragover dragenter", (_event) => {
                _event.preventDefault();
                _event.stopPropagation();
                dropZone.addClass("scv-dragover");
            });
            dropZone.on("dragleave dragend", (_event) => {
                _event.preventDefault();
                _event.stopPropagation();
                dropZone.removeClass("scv-dragover");
            });
            dropZone.on("drop", (_event) => {
                _event.preventDefault();
                _event.stopPropagation();
                dropZone.removeClass("scv-dragover");

                let files = _event.originalEvent.dataTransfer.files;
                if(files.length > 0){
                    handleFileSelected(files[0]);
                }
            });

            fileInput.off().on("change", function () {
                if(this.files.length > 0){
                    handleFileSelected(this.files[0]);
                }
                this.value = "";
            });

            jQuery("#scvUploadFileRemove").off().on("click", () => resetFileSelected());
            jQuery("#scvUploadBtnCancel").off().on("click", () => closePopup());
            jQuery("#scvUploadBtnUpload").off().on("click", () => confirmUpload());
        }

        window._scvInitPopupUploadFile();
    }

    const closePopup = () =>{
        try{
            if(!!State.win && typeof State.win.close == "function"){
                State.win.close();
                return;
            }
            if(typeof Ext != "undefined" && !!Ext.getCmp(Popup.WIN_NAME)){
                Ext.getCmp(Popup.WIN_NAME).close();
                return;
            }
            jQuery(`#${Popup.WIN_NAME}_frame`).closest(".x-window").hide();
        }
        catch(err){
            console.log("popupUploadFile closePopup", err.message);
        }
    }

    const resetFileSelected = () =>{
        State.file = null;
        State.fileType = "";
        State.textContent = "";
        State.rows = [];
        State.totalLine = 0;

        jQuery("#scvUploadFileInfo").hide();
        jQuery("#scvUploadBtnUpload").prop("disabled", true);
    }

    const handleFileSelected = async (_file) =>{
        let fileExt = "." + _file.name.split(".").pop().toLowerCase();

        if(!State.options.accept.includes(fileExt)){
            _scvForm.showMsgError(`File "${_file.name}" không được hỗ trợ. Chỉ chấp nhận: ${State.options.accept.join(", ")}.`);
            return;
        }

        resetFileSelected();

        try{
            if([".xls", ".xlsx"].includes(fileExt)){
                State.fileType = "excel";

                let buf = await _file.arrayBuffer();
                let workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buf);

                let worksheet = workbook.worksheets[0];

                let arrRows = [];
                worksheet.eachRow({includeEmpty: false}, (row) => {
                    arrRows.push(row.values.slice(1).map(val => getCellValue(val)));
                });

                State.rows = arrRows;
                State.totalLine = arrRows.length;
            }
            else{
                State.fileType = "csv";

                State.textContent = await _file.text();
                State.totalLine = State.textContent.split(/\r\n|\r|\n/).filter(e => e.trim() !== "").length;
            }
        }
        catch(err){
            resetFileSelected();
            _scvForm.showMsgError(`Không thể đọc file "${_file.name}". Nếu là file Excel 97-2003 (.xls), vui lòng lưu lại dưới định dạng .xlsx và thử lại. (${err.message})`);
            return;
        }

        State.file = _file;

        jQuery("#scvUploadFileName").text(_file.name);
        jQuery("#scvUploadFileSize").text(formatFileSize(_file.size));
        jQuery("#scvUploadFileTotalLine").text(`Total lines: ${State.totalLine}`);
        jQuery("#scvUploadFileInfo").css("display", "flex");
        jQuery("#scvUploadBtnUpload").prop("disabled", false);
    }

    const formatFileSize = (_bytes) =>{
        if(_bytes < 1024) return _bytes + " B";
        if(_bytes < 1024 * 1024) return (_bytes / 1024).toFixed(1) + " KB";
        return (_bytes / (1024 * 1024)).toFixed(2) + " MB";
    }

    const getCellValue = (_val) =>{
        if(_val === null || _val === undefined) return "";
        if(_val instanceof Date) return nlapiDateToString(_val, "date");
        if(typeof _val == "object"){
            if(!!_val.richText) return _val.richText.map(e => e.text).join("");
            if(_val.result !== undefined) return getCellValue(_val.result);
            if(_val.text !== undefined) return getCellValue(_val.text);
            if(!!_val.hyperlink) return _val.hyperlink;
            return "";
        }
        return _val;
    }

    const parseCsvText = (_text, _colDelimiter) =>{
        let arrRows = [], arrRow = [], curVal = "", inQuotes = false;

        for(let i = 0; i < _text.length; i++){
            let ch = _text[i];

            if(inQuotes){
                if(ch === '"'){
                    if(_text[i + 1] === '"'){
                        curVal += '"';
                        i++;
                    }
                    else{
                        inQuotes = false;
                    }
                }
                else{
                    curVal += ch;
                }
            }
            else if(ch === '"'){
                inQuotes = true;
            }
            else if(ch === _colDelimiter){
                arrRow.push(curVal);
                curVal = "";
            }
            else if(ch === "\n" || ch === "\r"){
                if(ch === "\r" && _text[i + 1] === "\n") i++;

                arrRow.push(curVal);
                curVal = "";

                if(arrRow.length > 1 || arrRow[0].trim() !== "") arrRows.push(arrRow);
                arrRow = [];
            }
            else{
                curVal += ch;
            }
        }

        arrRow.push(curVal);
        if(arrRow.length > 1 || arrRow[0].trim() !== "") arrRows.push(arrRow);

        return arrRows;
    }

    const parseNumber = (_val, _decimalDelimiter) =>{
        // Ô trống giữ "" để phân biệt với giá trị 0 user nhập
        if(_val === null || _val === undefined || _val === "") return "";
        if(typeof _val == "number") return _val;

        let strVal = _val.toString().trim();
        if(!strVal) return "";

        if(_decimalDelimiter === Stores.DecimalDelimiter.Comma.VALUE){
            strVal = strVal.replaceAll(".", "").replace(",", ".");
        }
        else{
            strVal = strVal.replaceAll(",", "");
        }

        let numVal = parseFloat(strVal);
        return isNaN(numVal) ? 0 : numVal;
    }

    const buildLines = (_arrRows, _decimalDelimiter) =>{
        let arrColumns = State.options.columns;

        let normalize = (val) => (val ?? "").toString().trim().toLowerCase();

        let arrHeader = (_arrRows[0] ?? []).map(val => normalize(val));

        let mapIdxToColumn = {};
        arrColumns.forEach(objColumn => {
            let idx = arrHeader.findIndex(header => header === normalize(objColumn.label) || header === normalize(objColumn.id));
            if(idx >= 0){
                mapIdxToColumn[idx] = objColumn;
            }
        });

        // Không tìm thấy dòng header thì map theo thứ tự cột, dòng đầu là data
        let hasHeader = Object.keys(mapIdxToColumn).length > 0;
        if(!hasHeader){
            arrColumns.forEach((objColumn, idx) => mapIdxToColumn[idx] = objColumn);
        }

        let arrDataRows = hasHeader ? _arrRows.slice(1) : _arrRows;

        let arrLines = [];
        arrDataRows.forEach(arrRow => {
            let objLine = {};
            let hasValue = false;

            arrColumns.forEach(objColumn => {
                objLine[objColumn.id] = "";
            });

            Object.keys(mapIdxToColumn).forEach(idx => {
                let objColumn = mapIdxToColumn[idx];
                let val = arrRow[idx];

                if(objColumn.type == "float"){
                    objLine[objColumn.id] = parseNumber(val, _decimalDelimiter);
                }
                else{
                    objLine[objColumn.id] = (val ?? "").toString().trim();
                }

                if(objLine[objColumn.id] !== "" && objLine[objColumn.id] !== 0){
                    hasValue = true;
                }
            });

            if(hasValue){
                arrLines.push(objLine);
            }
        });

        return arrLines;
    }

    const confirmUpload = () =>{
        if(!State.file){
            _scvForm.showMsgError("Chọn file để upload.");
            return;
        }

        let arrRows = [];
        let decimalDelimiter = Stores.DecimalDelimiter.Period.VALUE;

        if(State.fileType === "excel"){
            arrRows = State.rows;
        }
        else{
            let columnDelimiter = Object.values(Stores.ColumnDelimiter).find(e => e.ID === State.options.columnDelimiter)?.VALUE
                ?? Stores.ColumnDelimiter.Comma.VALUE;
            decimalDelimiter = Object.values(Stores.DecimalDelimiter).find(e => e.ID === State.options.decimalDelimiter)?.VALUE
                ?? Stores.DecimalDelimiter.Period.VALUE;

            arrRows = parseCsvText(State.textContent, columnDelimiter);
        }

        let arrLines = buildLines(arrRows, decimalDelimiter);

        if(arrLines.length == 0){
            _scvForm.showMsgError("File không có dòng dữ liệu hợp lệ.");
            return;
        }

        let objFileInfo = {
            name: State.file.name,
            size: State.file.size,
            totalLine: State.totalLine,
        };

        closePopup();

        if(typeof State.options.onUpload == "function"){
            State.options.onUpload(arrLines, objFileInfo);
        }
    }

    return {
        Stores,
        showPopup,
    };

});
