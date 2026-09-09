/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  27 Aug 2026         Huy Pham			    Init, create file, PMP_WBS Import, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d453pe8)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    '../common/scv_common_wbs_import.js',
    '../common/scv_common_csr_uploadfile_popup.js',
], (
    commonWbsImport,
    commonCSRUploadFilePopup,
    ) => {
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        const pageInit = (scriptContext) => {
            initFieldsByTimeLineType();

            initSublist();
        }

        const initSublist = () => {
            _scvFormSublist.setOption("custpage_wbs_lines", "onRowPrepared", function (e) {
                if(e.data._scvMsg){
                    e.rowElement[0].style["color"] = "red";
                    Array.from(e.rowElement[0].cells).forEach(cell => cell.style.setProperty("color", "red", "important"));
                }
            });

            _scvFormSublist.setOption("custpage_wbs_lines", "onCellPrepared", function(e){
                if(e.column.id == "custpage_col_key"){
                    
                }
            });
        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        const fieldChanged = (scriptContext) => {
            let curRec = scriptContext.currentRecord;
            let sublistId = scriptContext.sublistId;
            let fieldId = scriptContext.fieldId;
            let line = scriptContext.line;

            if(fieldId === "custpage_project"){
                searchResult();
            }
            if(fieldId === "custpage_wbs_timelinetype"){
                initFieldsByTimeLineType();
            }
        }

        const initFieldsByTimeLineType = () =>{
            let curRec = _scvForm.currentRecord;

            let timeLineTypeId = curRec.getValue("custpage_wbs_timelinetype");

            let showFields = {
                custpage_wbs_startdate: true,
                custpage_wbs_enddate: true,
            }

            if(timeLineTypeId === commonWbsImport.Stores.TimeLineType.Global.ID){
                showFields.custpage_wbs_startdate = false;
                showFields.custpage_wbs_enddate = false;
            }

            Object.keys(showFields).forEach(fieldId => {
                let field = curRec.getField(fieldId);

                if(showFields[fieldId]){
                    field.isMandatory = true;
                    field.isDisplay = true;
                }
                else{
                    field.isMandatory = false;
                    field.isDisplay = false;
                }
                
            })
        }

        const searchResult = async () => {            
            let params = _scvForm.getParameter();

            _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
                ...params,
                action: "getDataSource",
            }, (_response) => {
                let objResult = _response.data;

                let curRec = _scvForm.currentRecord;

                curRec.setValue("custpage_wbs_description", objResult.custpage_wbs_description);
                curRec.setValue("custpage_wbs_timelinetype", objResult.custpage_wbs_timelinetype);

                if(objResult.custpage_wbs_startdate){
                    curRec.setValue("custpage_wbs_startdate", nlapiStringToDate(objResult.custpage_wbs_startdate));
                }
                if(objResult.custpage_wbs_enddate){
                    curRec.setValue("custpage_wbs_enddate", nlapiStringToDate(objResult.custpage_wbs_enddate));
                }

                _scvFormSublist.addDataSource("custpage_sl_tasks", objResult.custpage_sl_tasks);
                _scvFormSublist.addDataSource("custpage_wbs_lines", objResult.custpage_wbs_lines);
            });
        }

        const uploadResult = async () => {
            commonCSRUploadFilePopup.showPopup({
                title: "Upload File",
                columns: commonWbsImport.getColumnsWbsLines(_scvForm.getParameter()),
                onUpload: (arrLines, objFileInfo) => {
                    let params = _scvForm.getParameter();

                    _scvFormSublist.addDataSource("custpage_wbs_lines", commonWbsImport.formatterResultUpload(params, arrLines));
                }
            });
        }

        const submitResult = async () => {
            let isValid = _scvForm.validateFieldMandatory([
                "custpage_project", "custpage_wbs_timelinetype",
                "custpage_wbs_startdate", "custpage_wbs_enddate",
            ])
            if(!isValid) return;

            if(!confirm("Are you sure you want to submit the data?")) return;

            disableButtonSubmit();

            let params = _scvForm.getParameter();

            _scvForm.showLoadingDialog(true);

            let arrLine = _scvFormSublist.getDataSource("custpage_wbs_lines");
            if(arrLine.length == 0){
                _scvForm.showMsgError("Chọn ít nhất 1 line để submit.");
                _scvForm.showLoadingDialog(false);
                disableButtonSubmit(false);
                return;
            }

            let validateSubmit = commonWbsImport.validationResultLines(params, arrLine);
            if(!validateSubmit.isValid){
                _scvForm.showMsgError(validateSubmit.msg);
                _scvForm.showLoadingDialog(false);
                disableButtonSubmit(false);
                return;
            }

            _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
                ...params,
                action: "submitResult",
                arrLine: JSON.stringify(arrLine)
            }, (_response) => {
                let objResult = _response.data;

                if(objResult.success){
                    _scvForm.showMsgInfo(objResult.msg);
                }
                else{
                    alert(objResult.msg);

                    _scvForm.showMsgError(objResult.msg);
                }
                _scvForm.showLoadingDialog(false);

                disableButtonSubmit(false); 
            });
        }

        const downloadTemplate = async (_tmplUrl) => {
            if(!_tmplUrl){
                alert("Template import do not exists.");
                return;
            }

            let workbook = await _scvExcelJS.loadWorkbookFromUrl(_tmplUrl);

            saveAs(new Blob([await workbook.xlsx.writeBuffer()]), "Template import WBS.xlsx");
        }

        const disableButtonSubmit = (val = true) => {
            window.disableButton("custpage_btn_submit", val);
            window.disableButton("secondarycustpage_btn_submit", val);
        }

        return {
            pageInit,
            fieldChanged,
            searchResult,
            uploadResult,
            submitResult,
            downloadTemplate,
        };

    });
