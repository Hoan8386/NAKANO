/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Huy Pham                Init, create file. Create RPO (Requisition) from Project_WBS, from ms.Ngọc(https://app.clickup.com/t/3773072/14yhnhmfjj0)
 *  23 Sep 2026         Huy Pham                Bổ sung logic Tax Code, from ms.Ngọc(https://app.clickup.com/t/3773072/14yhnhmfjj0?comment=1300230000034947)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    'N/url',

    '../cons/scv_cons_record.js',

    '../common/scv_common_wbs2rpo.js',
],(
    url,

    constRecord,

    commonWbs2Rpo,
    )  => {
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            window.onbeforeunload = null;

            let curRec = scriptContext.currentRecord;
            
            constRecord.pageInitQuickFindFieldSelect(curRec, ["custpage_employee", "custpage_def_vendor"]);
            
            loadDataToStores();

            disableColumns(curRec);
        }

        const disableColumns = (curRec) =>{
            let sublistId = "custpage_sl_result";
            let sizeLine = curRec.getLineCount(sublistId);

            for(let i = 0; i < sizeLine; i++){
                ["custpage_col_rpo_taxamount", "custpage_col_rpo_amount"].forEach(fieldId => {
                    curRec.getSublistField({sublistId: sublistId, fieldId: fieldId, line: i}).isDisabled = true;
                })
            }
        }

        const loadDataToStores = () =>{
            _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
                action: "getSalesTaxItem",
            }, (_response) => {
                commonWbs2Rpo.setStoresSalesTaxItem(_response.data);
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
        function fieldChanged(scriptContext) {
            let curRec = scriptContext.currentRecord;
            let sublistId = scriptContext.sublistId;
            let lineNum = scriptContext.line;
            let fieldId = scriptContext.fieldId;

            if(fieldId === "custpage_subsidiary"){
                reloadVendorField(curRec);
                reloadTaxCodeField(curRec);
            }

            if(["custpage_col_rpo_qty", "custpage_col_rpo_rate", "custpage_col_rpo_tax"].includes(fieldId)){
                calcDefaultColumns(curRec, sublistId);
            }
        }

        const calcDefaultColumns = (curRec, sublistId) =>{
            let objLine = {
                custpage_col_rpo_qty: curRec.getCurrentSublistValue(sublistId, "custpage_col_rpo_qty"),
                custpage_col_rpo_rate: curRec.getCurrentSublistValue(sublistId, "custpage_col_rpo_rate"),
                custpage_col_rpo_tax: curRec.getCurrentSublistValue(sublistId, "custpage_col_rpo_tax"),

                custpage_col_rpo_amount: 0,
                custpage_col_rpo_taxamount: 0,
            };

            commonWbs2Rpo.calcRpoAmount(objLine);
            commonWbs2Rpo.calcRpoTaxAmount(objLine);

            curRec.setCurrentSublistValue({
                sublistId: sublistId, fieldId: "custpage_col_rpo_amount", value: objLine.custpage_col_rpo_amount, ignoreFieldChange: true
            });
            curRec.setCurrentSublistValue({
                sublistId: sublistId, fieldId: "custpage_col_rpo_taxamount", value: objLine.custpage_col_rpo_taxamount, ignoreFieldChange: true
            });
        }

        const reloadVendorField = (curRec) =>{
            let params = _scvForm.getParameter();
            _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
                ...params,
                action: "getVendors",
            }, (_response) => {
                constRecord.initLoadFieldClient(curRec.getField('custpage_def_vendor'), {
                    displayExpr: "name", valueExpr: "internalid", data: _response.data
                }, true);
            });
        }

        const reloadTaxCodeField = (curRec) =>{
            let params = _scvForm.getParameter();
            _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
                ...params,
                action: "getSalesTaxItem",
            }, (_response) => {
                constRecord.initLoadFieldClient(curRec.getField('custpage_def_taxcode'), {
                    displayExpr: "name", valueExpr: "internalid", data: _response.data
                }, true);
            });
        }

        const searchResult = async () => {
            let isValid = _scvForm.validateFieldMandatory([
                "custpage_subsidiary", "custpage_project",
            ]);
            if(!isValid) return;

            let params = _scvForm.getParameter();
            [
                "custpage_subsidiary_display", "custpage_project_display",
                "custpage_employee_display", "custpage_def_vendor_display",
                "custpage_def_currency_display",
            ].forEach(_key => delete params[_key]);

            let urlScript = url.resolveScript({
                scriptId: _scvForm.currentScript.id,
                deploymentId: _scvForm.currentScript.deploymentId,
                params: {
                    ...params,
                    isSearch: "T"
                }
            });

            window.location.replace(urlScript);
        }

        const submitResult = async (_actionType)=>{
            let isValid = _scvForm.validateFieldMandatory(["custpage_subsidiary", "custpage_project"]);
            if(!isValid) return;

            let arrLines = _scvFormSublist.getDataSource("custpage_sl_result").filter(e => e.custpage_col_chk);
            if(arrLines.length === 0){
                alert("Select at least one line.");
                return;
            }

            if(!confirm("Do you want to create the Request Purchase Order?")) return;

            let params = _scvForm.getParameter();

            _scvForm.showLoadingDialog(true);

            _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
                ...params,
                action: "submitResult",
                actionType: _actionType,
                arrLines: JSON.stringify(arrLines)
            }, (_response) => {
                let objResult = _response.data;

                if(objResult.success){
                    _scvForm.showMsgInfo(objResult.msg);

                    window.open(objResult.url);
                }
                else{
                    alert(objResult.msg);
                    _scvForm.showMsgError(objResult.msg);
                }

                _scvForm.showLoadingDialog(false);
            });
        }

        return {
            pageInit,
            fieldChanged,
            searchResult,
            submitResult,
        };

    });
