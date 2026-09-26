/**
 * Nội dung: 
 * Mapping:
 * =======================================================================================
 *  Date                Author                  Description
 *  21 Sep 2026         Huy Pham                Init, create file. Check Working Budget, excess cost RPO, PO, from mr.Bính (https://app.clickup.com/t/3773072/14yhnhmftzf)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/redirect',

    '../common/scv_common_checkbudget.js',
],
    
    (
        redirect,

        commonCheckBudget,
    ) => {
        const onRequest = (scriptContext) => {
            let request = scriptContext.request;
            let params = request.parameters;

            commonCheckBudget.checkBudget(params);

            redirect.toRecord({
                type: params.recordType,
                id: params.recordId,
                parameters: {
                    keyResponse: params.keyResponse
                }
            });
        }

        return {
            onRequest
        }

    });
