/**
 * Nội dung: 
 * Mapping:
 * =======================================================================================
 *  Date                Author                  Description
 *  21 Sep 2026         Huy Pham                Init, create file. Check Working Budget, excess cost RPO, PO, from ms.Ngọc (https://app.clickup.com/t/3773072/14yhnhmftzf)
 *  24 Sep 2026         Huy Pham                Update logic theo {line_key}, from ms.Ngọc(https://app.clickup.com/t/3773072/14yhnhmftzf?comment=1300230000036703s)
 */
define(['N/url', 'N/record', 'N/runtime', 'N/search', 'N/ui/message', 'N/query',
    '../cons/scv_cons_cache.js',

    '../cons/scv_cons_search_checkbudget_01.js',
    '../cons/scv_cons_search_checkbudget_02.js',
], (url, record, runtime, search, message, query,
    constCache,

    constSearchCheckBudget01,
    constSearchCheckBudget02,
) => {

    const validateCheckBudget = (curRec) =>{
        let csegProjectId = curRec.getValue("cseg_scv_sg_proj");
        if(!csegProjectId) return false;

        return true;
    }

    const addBtnCheckBudget = (scriptContext) => {
        if(runtime.executionContext !== runtime.ContextType.USER_INTERFACE) return;

        if(scriptContext.type !== "view") return;
        
        showMsgResponse(scriptContext);

        let curRec = scriptContext.newRecord;

        if(!validateCheckBudget(curRec)) return;

        let urlScript = url.resolveScript({
            scriptId: 'customscript_scv_sl_checkbudget',
            deploymentId: 'customdeploy_scv_sl_checkbudget',
            params: {
                recordId: curRec.id,
                recordType: curRec.type,
            }
        });

        scriptContext.form.addButton({
            id: "custpage_scv_btn_checkbudget",
            label: "Check Budget",
            functionName: "window.location.replace('" + urlScript + "');"
        });
    }

    const showMsgResponse = (scriptContext) =>{
        let params = scriptContext?.request?.parameters;

        let keyResponse = params?.keyResponse;
        if(!keyResponse) return;

        let objResCache = constCache.getDataByUser(keyResponse, true, "scv_common_checkbudget");
        if(!objResCache || !objResCache?.data) return;

        let objResponse = objResCache.data;

        scriptContext.form.addPageInitMessage({
            title: "Check Budget",
            type: objResponse.success ? message.Type.CONFIRMATION : message.Type.ERROR,
            message: objResponse.msg,
            duration: -1
        });
    }

    const checkBudget = (params) => {
        let objResponse = {
            success: true,
            msg: "Success."
        };

        try{
            let transRec = record.load({type: params.recordType, id: params.recordId, isDynamic: true});
            if(!validateCheckBudget(transRec)) return;

            let subsidiaryId = transRec.getValue("subsidiary");
            let csegProjectId = transRec.getValue("cseg_scv_sg_proj");
            //let createdDate = transRec.getValue("createddate");//HuyPQ-20260921: chỉ đang lấy tới phút nên không phù hợp 

            let createdDate_YYYYMMDDHH24MISS = query.runSuiteQL({
                query: `SELECT
                    to_char (createddate, 'YYYYMMDDHH24MISS') AS createddate
                FROM
                    transaction
                WHERE
                    id = ${params.recordId}`
            }).asMappedResults()[0]?.createddate;

            let arrLineWbs01 = constSearchCheckBudget01.getDataSource({
                subsidiary: subsidiaryId,
                cseg_scv_sg_proj: csegProjectId,
            });

            let arrLineTrans02 = constSearchCheckBudget02.getDataSource({
                subsidiary: subsidiaryId,
                cseg_scv_sg_proj: csegProjectId,
                datecreated_YYYYMMDDHH24MISS: createdDate_YYYYMMDDHH24MISS,
            });
            
            let itemSublistId = "item";
            let sizeItemSublist = transRec.getLineCount(itemSublistId);

            for(let i = 0; i < sizeItemSublist; i++) {
                transRec.selectLine(itemSublistId, i);

                let workItemCodeId = transRec.getCurrentSublistValue(itemSublistId, "cseg_paactivitycode");
                let oriLineId = transRec.getCurrentSublistValue(itemSublistId, "custcol_scv_ori_lineid");

                let workingBudget = 0;
                let accumulateAmount = 0;
                let balance = 0;
                let excessCostNet = 0;
                let savingCost = 0;

                let objLineWbs01 = arrLineWbs01.find(e => e.work_item_code === workItemCodeId
                    && e.line_key === oriLineId
                );
                if(objLineWbs01){
                    workingBudget = objLineWbs01.budget_eac * 1;
                }
                
                let arrLineTrans02_Detail = arrLineTrans02.filter(e => e.work_item_code === workItemCodeId
                    && e.line_key === oriLineId
                );
                
                accumulateAmount = arrLineTrans02_Detail.reduce((sum, obj) => sum + obj.acc_amount * 1, 0);

                balance = workingBudget - accumulateAmount;

                if(balance > 0){
                    excessCostNet = 0;
                    savingCost = balance;
                }
                else{
                    excessCostNet = Math.abs(balance);
                    savingCost = 0;
                }

                transRec.setCurrentSublistValue(itemSublistId, "custcol_scv_working_budget", workingBudget);
                transRec.setCurrentSublistValue(itemSublistId, "custcol_scv_accumulate_amt", accumulateAmount);
                transRec.setCurrentSublistValue(itemSublistId, "custcol_scv_balance", balance);
                transRec.setCurrentSublistValue(itemSublistId, "custcol_scv_excess_cost_net", excessCostNet);
                transRec.setCurrentSublistValue(itemSublistId, "custcol_scv_saving_cost", savingCost);

                transRec.commitLine(itemSublistId);
            }

            transRec.save({enableSourcing: false, ignoreMandatoryFields: true});
        }
        catch(err){
            objResponse.success = false;
            objResponse.msg = err?.message?.toString() ?? err?.toString();
        }

        params.keyResponse = Date.now();
        constCache.putDataByUser(params.keyResponse, objResponse, "scv_common_checkbudget")

        return objResponse;
    }

    return {
        addBtnCheckBudget,
        checkBudget,
    };

});
