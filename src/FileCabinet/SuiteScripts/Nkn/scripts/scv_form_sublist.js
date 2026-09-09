/**
 * Nội dung: 
 * Version: 1.260817.4
 * =======================================================================================
 *  Date                Author                  Description
 *  16 Jun 2026         Huy Pham                Init & create file
 */
const _scvFormSublist = {
    ResultStore: {},
    OptionCallBack: {
        //onCellPrepared: null,
        //onRowPrepared: null
        //onRowDblClick: null
    },

    initSublistPage: function (_sublistId, _options) {
        let sublistType = _scvForm.currentRecord.getSublist(_sublistId).type;
        if(["inlineeditor", "editor"].includes(sublistType)) return;

        let pageSize = _options.pageSize || 1000;
        let data = _options.data || [];
        let pageLabel = _options.pageLabel || "";
        
        if (!pageLabel) {
            let columns = _scvForm.sublists.find(e => e.id == _sublistId).columns.filter(e => e.displayType != "hidden");
            if (columns.length > 0) {
                pageLabel = columns[0].id;
            }
        }

        this.ResultStore[_sublistId] = {
            data: data,
            pageSize: pageSize,
            pageData: {},
            currentPage: 0,
            pageLabel: pageLabel,
        };

        if(_options?.treeList?.enable){
            let treeList = {..._options.treeList};
            treeList.isTreeList = true;
            treeList.mapParentIdExpanded = {};
            delete treeList.enable;

            Object.assign(this.ResultStore[_sublistId] , treeList);
        }

        this.renderPaginationSublist(_sublistId);

        this.addDataSource(_sublistId, data);
    },
    renderPaginationSublist: function (_sublistId) {
        let listControlBar = jQuery(`#${_sublistId}_layer .uir-list-control-bar`);
        if (listControlBar.length == 0) {
            listControlBar = jQuery(`
                <div class="uir-list-control-bar" data-above="true">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                        <tbody>
                            <tr>
                            </tr>
                        </tbody>
                    </table>
                </div>`);
            jQuery(`#${_sublistId}_form`).before(listControlBar);
        }

        const tbody = listControlBar.find('tbody').first();

        let tr_first = tbody.find("tr").first();
        if (tr_first.length) {
            tr_first.append(`
                <td>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tbody>
                            <tr>
                                <td align="right">
                                    <span class="scv-filter">
                                        <span id="scv_count_find_${_sublistId}" class="scv-total-count"></span>
                                        <input type="text" id="scv_filter_${_sublistId}" placeholder="Filter..." />
                                    </span>
                                    <span class="uir-pagination-select-wrapper uir-field-input">
                                        <span class="scv-ns-page-select">
                                            <select id="scv_page_${_sublistId}"></select>
                                        </span>
                                        <span class="uir-pagination-select-navig">
                                            <button type="button" onclick="_scvFormSublist.changePageGrid('${_sublistId}','prev')" class="navig-prev" aria-label="Previous"></button>
                                            <button type="button" onclick="_scvFormSublist.changePageGrid('${_sublistId}','next')" class="navig-next" aria-label="Next"></button>
                                        </span>
                                        <span id="scv_totalcount_${_sublistId}" class="scv-total-count">Total: 0</span>
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            `);
        }

        jQuery(`#scv_page_${_sublistId}`).change(function (_event) {
            _scvFormSublist.changePageGrid(_sublistId, jQuery(this).val());
        });

        jQuery(`#scv_filter_${_sublistId}`).change(function (_event) {
            _scvFormSublist.changeFilterGrid(_sublistId, jQuery(this).val());
        });
    },
    addDataSource: function (_sublistId, _arrResult) {
        const ResultStore = this.ResultStore;

        let arrResult = [..._arrResult];
        arrResult.forEach((objRes, index) =>{
            objRes.___NO = index;
        })
        ResultStore[_sublistId].data = [...arrResult];

        let arrResultShow = [...arrResult];

        if(ResultStore[_sublistId].isTreeList){
            ResultStore[_sublistId].mapParentIdExpanded = {};

            this.buildTreeIndex(_sublistId);

            arrResultShow = this.getVisibleRows(_sublistId);
        }

        this.updatePagination(_sublistId, arrResultShow);

        let val_filter = jQuery(`#scv_filter_${_sublistId}`).val() + "";

        if(val_filter){
            this.changeFilterGrid(_sublistId, val_filter);
        }
        else{
            this.addRows(_sublistId, ResultStore[_sublistId].pageData[0]?.data ?? []);
        }
    },
    getDataSource: function (_sublistId){
        let datas = this.ResultStore[_sublistId]?.data;
        if(!datas){
            datas = [];
            let curRec = _scvForm.currentRecord;
            let columns = _scvForm.sublists.find(e => e.id == _sublistId)?.columns ?? [];
            let sizeSublist = curRec.getLineCount(_sublistId);

            for(let i = 0; i < sizeSublist; i++){
                let objLine = {};

                columns.forEach(objCol => {
                    let colId = objCol.id;

                    objLine[colId] = curRec.getSublistValue(_sublistId, colId, i);

                    let val_display = curRec.getSublistText(_sublistId, colId, i);
                    if(["select", "date", "checkbox"].includes(objCol.type) && val_display){
                        objLine[colId + "_display"] = val_display;
                    }
                })

                datas.push(objLine);
            }
        }

        return datas;
    },
    changePageGrid: function (_sublistId, _value) {
        let val_filter = jQuery(`#scv_filter_${_sublistId}`).val() + "";
        if(!!val_filter){
            jQuery(`#scv_page_${_sublistId}`).val(ResultStore[_sublistId].currentPage);

            _scvForm.showMsgInfo("Please remove the pre-filtering condition.");
            return;
        }

        let idxPage = _value;
        if (["prev", "next"].includes(_value)) {
            let idxPageOld = jQuery(`#scv_page_${_sublistId}`).val() * 1;

            idxPage = _value == "prev" ? (idxPageOld - 1) : (idxPageOld + 1);
        }
        idxPage = idxPage * 1;

        const ResultStore = _scvFormSublist.ResultStore;

        if (!ResultStore[_sublistId].pageData[idxPage]) return;

        ResultStore[_sublistId].currentPage = idxPage;

        jQuery(`#scv_page_${_sublistId}`).val(idxPage);
        _scvFormSublist.addRows(_sublistId, ResultStore[_sublistId].pageData[idxPage]?.data ?? []);
    },
    changeFilterGrid: function (_sublistId, _value) {
        let val_find = _value?.toString();
        let arrResult = [];

        const ResultStore = _scvFormSublist.ResultStore;
        
        if (!!val_find) {
            val_find = val_find.toLowerCase().trim();

            let columns = _scvForm.sublists.find(e => e.id == _sublistId).columns.filter(e => e.displayType != "hidden");

            arrResult = ResultStore[_sublistId].data.filter(data => {
                let isValid = false;

                for (let i = 0; i < columns.length; i++) {
                    let colId = columns[i].id;

                    let val_col = data[colId]?.toString();
                    if (!val_col) continue;

                    if(columns[i].type == "checkbox"){
                        val_col = data[colId] ? "Yes" : "No";
                    }
                    val_col = val_col.toLowerCase().trim();

                    if (val_col.includes(val_find)) {
                        isValid = true;
                        break;
                    }
                }

                return isValid;
            });

            jQuery(`#scv_count_find_${_sublistId}`).text("Found: " + this.formatNumber(arrResult.length));
        } else {
            let idxPage = ResultStore[_sublistId].currentPage;
            arrResult = ResultStore[_sublistId].pageData[idxPage].data;
            jQuery(`#scv_count_find_${_sublistId}`).text("");
        }

        _scvFormSublist.addRows(_sublistId, arrResult);
    },
    addRows: function (_sublistId, _arrResult) {
        jQuery("#" + _sublistId + "header").nextAll().remove();

        let columns = _scvForm.sublists.find(e => e.id == _sublistId).columns;
        let labelColumns = jQuery(`input[name="${_sublistId}labels"]`).val().split("\x01");

        const ResultStoreSublist = _scvFormSublist.ResultStore[_sublistId];

        let isTreeList = ResultStoreSublist.isTreeList ? true : false;

        const currentSublist = [];

        for (let i = 0; i < _arrResult.length; i++) {
            let objRes = _arrResult[i];

            let lineNo = objRes.___NO;
            let rowId = _sublistId + "row" + lineNo;
            let rowEvenOdd = lineNo % 2 == 0 ? "uir-list-row-even" : "uir-list-row-odd";

            const contentsRow = `<tr class="uir-list-row-tr ${rowEvenOdd}" id="${rowId}">`;

            const currentRow = jQuery(contentsRow);

            let hasExpandCollap = isTreeList ? false : true;

            for (let j = 0; j < columns.length; j++) {
                let objCol = columns[j];

                let val_res = objRes[objCol.id] ?? "";

                let contentCell = ``;

                if (objCol.displayType == "hidden") {
                    contentCell += `<td class="listtext uir-list-row-cell" data-list-cell-type="string" hidden>${val_res}</td>`;
                    continue;
                }

                let htmlExpandCollap = ``;
                if(!hasExpandCollap){
                    hasExpandCollap = true;

                    let keyExpr_Value = objRes[ResultStoreSublist.keyExpr];
                    let indent = (objRes.___LEVEL ?? 0) * 20;

                    if(objRes.___HAS_CHILD){
                        let isRowExpanded = ResultStoreSublist.mapParentIdExpanded[keyExpr_Value] ?? ResultStoreSublist.autoExpandAll;
                        ResultStoreSublist.mapParentIdExpanded[keyExpr_Value] = isRowExpanded;

                        htmlExpandCollap = `<span style="display:inline-block; padding-left:${indent}px;">${_scvFormSublist.getSvgExpandCollap(_sublistId, keyExpr_Value, isRowExpanded)}</span>`;
                    }
                    else{
                        // line lá: chừa chỗ bằng bề rộng icon (24px) để thẳng hàng với line cha
                        htmlExpandCollap = `<span style="display:inline-block; padding-left:${indent + 24}px;"></span>`;
                    }
                }

                let label = labelColumns[j];
                let cellStyle = "";

                if (objCol.type == "checkbox" && util.isBoolean(val_res)) {
                    val_res = val_res ? "Yes" : "No";
                }
                else if (["float", "currency", "integer"].includes(objCol.type)) {
                    val_res = this.formatNumber(val_res);

                    if (["float", "currency"].includes(objCol.type)) {
                        cellStyle += `text-align: right`;
                    }
                }

                let cellId = _sublistId + "_" + objCol.id + "_" + lineNo;
                if (["text", "textarea", "checkbox"].includes(objCol.type)) {
                    if(objCol.type == "checkbox" && objCol.displayType == "entry"){
                        let isChecked = ["Yes", "T"].includes(val_res) ? "T" : "F";
                        contentCell += `<td id='${cellId}' class="uir-list-row-cell listtextctr" data-ns-tooltip="${label}">
                            ${htmlExpandCollap}
                            <span class="${isChecked == "T" ? "checkbox_ck" : "checkbox_unck"} uir-field-input" data-fieldtype="checkbox" onclick="NLCheckboxOnClick(this);">
                                <input type="checkbox" class="checkbox uir-check-box" ${isChecked == "T" ? "checked" : ""} aria-label="${label}"
                                onchange="_scvFormSublist.onChangeField('${_sublistId}', '${objCol.id}', '${lineNo}', this)">
                                <img class="checkboximage" src="/images/nav/ns_x.gif" alt="">
                            </span>
                        </td>`;
                    }
                    else{
                        contentCell += `<td id='${cellId}' class="listtext uir-list-row-cell" data-list-cell-type="string" data-ns-tooltip="${label}" style="${cellStyle}">
                            ${htmlExpandCollap}
                            <span>${val_res}</span>
                        </td>`;
                    }
                }
                else {

                    contentCell += `<td id='${cellId}' class="listtext uir-list-row-cell" data-list-cell-type="${objCol.type}" data-ns-tooltip="${label}" style="${cellStyle}">
                        ${htmlExpandCollap}
                        <span>${val_res}</span>
                    </td>`;
                }

                const currentCell = jQuery(contentCell);

                if(typeof this.OptionCallBack[_sublistId]?.onCellPrepared == "function"){
                    this.OptionCallBack[_sublistId].onCellPrepared({
                        data: objRes,
                        column: {...objCol},
                        dataOriginal: objRes[objCol.id],
                        value: val_res,
                        cellElement: currentCell
                    });
                }

                currentRow.append(currentCell);
            }

            if(typeof this.OptionCallBack[_sublistId]?.onRowPrepared == "function"){
                this.OptionCallBack[_sublistId].onRowPrepared({
                    data: objRes,
                    rowElement: currentRow
                });
            }

            if(typeof this.OptionCallBack[_sublistId]?.onRowDblClick == "function"){
                currentRow.on("dblclick", function(){
                    _scvFormSublist.OptionCallBack[_sublistId].onRowDblClick({data: objRes,});
                })
            }
            
            currentSublist.push(currentRow);
        }

        
        jQuery("#" + _sublistId + "header").after(currentSublist);
    },
    formatNumber: (_num, _fixed = 2, _options = {
        groupSeparator: window.groupseparator || '.',
        decimalSeparator: window.decimalseparator || ',',
    }) => {
        if (typeof _num === 'number' && _num % 1 !== 0) {
            _num = _num.toFixed(_fixed);
        }
        var parts = _num.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, _options.groupSeparator);
        return parts.join(_options.decimalSeparator);
    },
    shortenMiddle: function (text, startLength = 8, endLength = 8) {
        if (!text || text.length <= startLength + endLength) {
            return text;
        }

        return (
            text.substring(0, startLength) +
            "..." +
            text.substring(text.length - endLength)
        );
    },
    setOption: function(_sublistId, _key, _value){
        this.OptionCallBack[_sublistId] = this.OptionCallBack[_sublistId] ?? {}
        this.OptionCallBack[_sublistId][_key] = _value;

        return this.OptionCallBack[_sublistId][_key];
    },
    onChangeField: function(_sublistId, _fieldId, _line, _this){
        let objResLine = _scvFormSublist.getDataSource(_sublistId).find(e => e.___NO == _line);

        if(_this.type == "checkbox"){
            nsapiDispatchFieldChanged(_this);
            NLCheckboxOnChange(_this);

            objResLine[_fieldId] = _this.checked;
        }
    },
    setValueOfRow: function(_sublistId, _line, _value){

    },
    setLabelColumn: function(_sublistId, _fieldId, _label){
        let resultLabels = _scvForm.currentRecord.getValue(_sublistId + "labels").split("\x01");

        let indexFieldId = _scvForm.sublists.find(e => e.id == _sublistId).columns.findIndex(e => e.id == _fieldId);

        resultLabels[indexFieldId] = _label;

        _scvForm.currentRecord.setValue(_sublistId + "labels", resultLabels.join("\x01"));

        const tdOfColumn = jQuery("#" + _sublistId + "header td")[indexFieldId]
        tdOfColumn.setAttribute("data-label", _label);
        tdOfColumn.setAttribute("data-nsps-label", _label);
        jQuery(tdOfColumn).find('.listheader').contents().filter(function () {
            return this.nodeType === Node.TEXT_NODE;
        }).last().replaceWith(_label);
    },

    updatePagination: function(_sublistId, _arrResultShow){
        const listPageSelect = jQuery(`#scv_page_${_sublistId}`);
        listPageSelect.empty();

        const ResultStore = _scvFormSublist.ResultStore;

        let pageSize = ResultStore[_sublistId].pageSize || 1000;

        let size = _arrResultShow.length;

        let totalPage = Math.ceil(size / pageSize);

        ResultStore[_sublistId].pageData = {};

        let pageLabel = ResultStore[_sublistId].pageLabel;

        for (let idxPage = 0; idxPage < totalPage; idxPage++) {
            let arrDataOfPage = _arrResultShow.splice(0, pageSize);

            let pageName = `(${idxPage + 1}) `;

            if (!!pageLabel) {
                let pageName_From = arrDataOfPage[0][pageLabel] + "";
                let pageName_To = arrDataOfPage[arrDataOfPage.length - 1][pageLabel] + "";

                pageName += _scvFormSublist.shortenMiddle(pageName_From) + " ~ " + _scvFormSublist.shortenMiddle(pageName_To);
            }
            else {
                pageName += "None";
            }

            ResultStore[_sublistId].pageData[idxPage] = {
                name: pageName,
                data: arrDataOfPage
            };

            listPageSelect.append(
                jQuery('<option>', {
                    value: idxPage, text: pageName
                })
            );
        }

        let textTotalCount = "Total: " + _scvFormSublist.formatNumber(size);
        if(ResultStore[_sublistId].isTreeList){
            textTotalCount += "/" + _scvFormSublist.formatNumber(ResultStore[_sublistId].data.length);
        }

        jQuery(`#scv_totalcount_${_sublistId}`).text(textTotalCount);

        ResultStore[_sublistId].currentPage = 0;
    },

    buildTreeIndex: function (_sublistId) {
        const ResultStoreSublist = this.ResultStore[_sublistId];
        const keyExpr = ResultStoreSublist.keyExpr;
        const parentIdExpr = ResultStoreSublist.parentIdExpr;

        const mapNodeByKey = {};
        ResultStoreSublist.data.forEach(objRes => {
            mapNodeByKey[objRes[keyExpr]] = objRes;
        });

        const mapChildrenByParent = {};
        ResultStoreSublist.data.forEach(objRes => {
            let parentId = objRes[parentIdExpr];

            // parent không tồn tại trong data => coi như root, tránh mất line
            if (parentId !== ResultStoreSublist.rootValue && !mapNodeByKey[parentId]) {
                parentId = ResultStoreSublist.rootValue;
            }

            (mapChildrenByParent[parentId] = mapChildrenByParent[parentId] || []).push(objRes);
        });

        ResultStoreSublist.data.forEach(objRes => {
            objRes.___HAS_CHILD = (mapChildrenByParent[objRes[keyExpr]] || []).length > 0;
        });

        ResultStoreSublist.mapChildrenByParent = mapChildrenByParent;
    },
    getVisibleRows: function (_sublistId) {
        const ResultStoreSublist = this.ResultStore[_sublistId];
        const keyExpr = ResultStoreSublist.keyExpr;
        const mapChildrenByParent = ResultStoreSublist.mapChildrenByParent || {};

        const arrResultShow = [];

        const visit = (_parentId, _level) => {
            (mapChildrenByParent[_parentId] || []).forEach(objRes => {
                objRes.___LEVEL = _level;
                arrResultShow.push(objRes);

                if (objRes.___HAS_CHILD) {
                    let keyExpr_Value = objRes[keyExpr];

                    let isRowExpanded = ResultStoreSublist.mapParentIdExpanded[keyExpr_Value] ?? ResultStoreSublist.autoExpandAll;
                    ResultStoreSublist.mapParentIdExpanded[keyExpr_Value] = isRowExpanded;

                    if (isRowExpanded) {
                        visit(keyExpr_Value, _level + 1);
                    }
                }
            });
        };
        visit(ResultStoreSublist.rootValue, 0);

        return arrResultShow;
    },

    toggleIconExpandCollap: function(event){
        let sublistId = event.getAttribute("scv-sublist")
        let rowId = event.getAttribute("scv-id")
        let isExpand = event.getAttribute("scv-expand") === "T" ? true : false;

        let ResultStoreSublist = _scvFormSublist.ResultStore[sublistId];

        ResultStoreSublist.mapParentIdExpanded[rowId] = !isExpand;

        let arrResultShow = _scvFormSublist.getVisibleRows(sublistId);

        _scvFormSublist.updatePagination(sublistId, arrResultShow);

        let val_filter = jQuery(`#scv_filter_${sublistId}`).val() + "";

        if(val_filter){
            _scvFormSublist.changeFilterGrid(sublistId, val_filter);
        }
        else{
            _scvFormSublist.addRows(sublistId, ResultStoreSublist.pageData[0]?.data ?? []);
        }
    },

    getSvgExpandCollap: function(_sublistId, _id, _isExpand) {
        let pathSvg = _scvFormSublist.getSvgPathCollap();
        if(!_isExpand){
            pathSvg = _scvFormSublist.getSvgPathExpand();
        }

        return `
        <svg onclick="_scvFormSublist.toggleIconExpandCollap(this)"
            scv-sublist="${_sublistId}" scv-id="${_id}" scv-expand="${_isExpand ? "T" : "F"}"
            viewBox="0 0 24 24" role="presentation" data-border-radius="square" data-widget="Image" data-status="none" tabindex="-1" style="width: 24px; height: 24px;">
            <path d="${pathSvg}"></path>
        </svg>`;
    },
    getSvgPathExpand: function(){
        return "M13 11V9h-2v2H9v2h2v2h2v-2h2v-2zM6 7.33C6 6.595 6.595 6 7.33 6h9.34c.735 0 1.33.595 1.33 1.33v9.34A1.33 1.33 0 0 1 16.67 18H7.33A1.33 1.33 0 0 1 6 16.67z";
    },
    getSvgPathCollap: function(){
        return "M6 7.33C6 6.595 6.595 6 7.33 6h9.34c.735 0 1.33.595 1.33 1.33v9.34A1.33 1.33 0 0 1 16.67 18H7.33A1.33 1.33 0 0 1 6 16.67zM9 11v2h6v-2z";
    },
};