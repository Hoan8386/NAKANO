/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/url'],
    
    function (ccr, url) {
        
        function refresh() {
            window.location.reload();
        }
        
        function searchReport() {
            window.onbeforeunload = null;
            var currentRecord = ccr.get();
            var urlDC = url.resolveScript({
                scriptId: 'customscript_scv_sl_allocation_closing',
                deploymentId: 'customdeploy_scv_sl_allocation_closing',
                returnExternalUrl: false
            });
            urlDC = urlDC + plusParam(currentRecord);
            window.location.replace(urlDC);
        }
        
        function plusParam(currentRecord) {
            return '&custpage_template=' + currentRecord.getValue('custpage_template')
                + '&custpage_subsidiary=' + currentRecord.getValue('custpage_subsidiary')
                + '&custpage_trandate=' + document.getElementById("custpage_trandate").value;
        }
        
        function fieldChanged(scriptContext) {
        }
        
        
        return {
            refresh: refresh,
            searchReport: searchReport,
            fieldChanged: fieldChanged
        };
        
    });
