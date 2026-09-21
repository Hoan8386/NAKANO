/**
 * Nội dung: 
 * Mapping:
 * =======================================================================================
 *  Date                Author                  Description
 *  18 Sep 2026         Huy Pham                Init, create file. Tính toán Net Cost trên Project tab Financial, from mr.Bính (https://app.clickup.com/t/3773072/14yhnhmfqr2)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/redirect',

    '../common/scv_common_project_calculate.js',
],
    
    (
        redirect,

        commonProjectCalc,
    ) => {
        const onRequest = (scriptContext) => {
            let request = scriptContext.request;
            let params = request.parameters;

            commonProjectCalc.calcNetCost(params);

            redirect.toRecord({
                type: params.recordType,
                id: params.recordId,
            });
        }

        return {
            onRequest
        }

    });
