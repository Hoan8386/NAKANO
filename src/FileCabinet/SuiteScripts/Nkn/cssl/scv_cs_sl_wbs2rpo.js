/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Huy Pham                Init, create file. Create RPO (Requisition) from Project_WBS, from ms.Ngọc(https://app.clickup.com/t/3773072/14yhnhmfjj0)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    'N/url',
],(
    url,
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

            let paramsUrl = _scvForm.getUrlParams();
            if(paramsUrl.isPopup == "T"){

            }
            else{

            }
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
        }

        const searchResult = async () => {
            let isValid = _scvForm.validateFieldMandatory([
                "custpage_subsidiary", "custpage_project",
            ]);
            if(!isValid) return;

            let params = _scvForm.getParameter();

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

            if(!confirm("Are you sure createRPO?")) return;

            let params = _scvForm.getParameter();

            _scvForm.showLoadingDialog(true);

            _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
                ...params,
                action: "submitResult",
                actionType: _actionType
            }, (_response) => {
                let objResult = _response.data;

                if(objResult.success){
                    _scvForm.showMsgInfo(objResult.msg);
                    _scvFormSublist.addDataSource("custpage_sl_result", []);
                }
                else{
                    alert(objResult.msg);
                    _scvForm.showMsgError(objResult.msg);
                }

                _scvForm.showLoadingDialog(false);
            });
        }

        const openStatusQueue = (_urlPopup, _width, _height, _title) =>{
            nlExtOpenWindow(_urlPopup, 'popupStatusQueue', _width, _height, this, true, _title);
        }

        return {
            pageInit,
            fieldChanged,
            searchResult,
            submitResult,
            openStatusQueue,
        };

    });
