/**
 * Nội dung: 
 * Mapping:
 * =======================================================================================
 *  Date                Author                  Description
 *  18 Sep 2026         Huy Pham                Init, create file. Tính toán Net Cost trên Project tab Financial, from mr.Bính (https://app.clickup.com/t/3773072/14yhnhmfqr2)
 */
define(['N/url', 'N/record', 'N/runtime', 'N/ui/message',
    '../cons/scv_cons_format.js',
    '../cons/scv_cons_cache.js',

    '../cons/scv_cons_search_project_net_cost.js',
], (url, record, runtime, message,
    constFormat,
    constCache,

    constSearchProjectNetCost,
) => {

    const addBtnCalcNetCost = (scriptContext) => {
        if(runtime.executionContext !== runtime.ContextType.USER_INTERFACE) return;

        if(scriptContext.type !== "view") return;

        showMsgResponse(scriptContext);

        let curRec = scriptContext.newRecord;

        let urlScript = url.resolveScript({
            scriptId: 'customscript_scv_sl_project_calculate',
            deploymentId: 'customdeploy_scv_sl_project_calculate',
            params: {
                recordId: curRec.id,
                recordType: curRec.type,
            }
        });

        scriptContext.form.addButton({
            id: "custpage_scv_btn_projcalc_netcost",
            label: "Calculate Net Cost",
            functionName: "window.location.replace('" + urlScript + "');"
        });
    }

    const showMsgResponse = (scriptContext) =>{
        let params = scriptContext?.request?.parameters;

        let keyResponse = params?.keyResponse;
        if(!keyResponse) return;

        let objResCache = constCache.getDataByUser(keyResponse, true, "scv_common_project_calculate");
        if(!objResCache || !objResCache?.data) return;

        let objResponse = objResCache.data;

        scriptContext.form.addPageInitMessage({
            title: "Calculate Net Cost",
            type: objResponse.success ? message.Type.CONFIRMATION : message.Type.ERROR,
            message: objResponse.msg,
            duration: -1
        });
    }

    const calcNetCost = (params) => {
        let objResponse = {
            success: true,
            msg: "Success."
        };

        try{
            let projectRec = record.load({type: "job", id: params.recordId});

            let netCost = 0;
            let totalProfit = 0;

            const jobPrice = projectRec.getValue("jobprice") * 1;

            if(params.recordId){
                let arrResult = constSearchProjectNetCost.getDataSource({
                    project: params.recordId
                });
                
                netCost = (arrResult[0]?.budget_eac ?? 0) * 1;
            }

            totalProfit = jobPrice - netCost;
            
            projectRec.setValue("custentity_scv_p_net_cost", netCost);
            projectRec.setValue("custentity_scv_p_total_profit", totalProfit);

            projectRec.save({enableSourcing: false, ignoreMandatoryFields: true});
        }
        catch(err){
            objResponse.success = false;
            objResponse.msg = err?.message?.toString() ?? err?.toString();
        }

        params.keyResponse = Date.now();
        constCache.putDataByUser(params.keyResponse, objResponse, "scv_common_project_calculate")

        return objResponse;
    }

    const autoCalcProject = (curRec) =>{
        let projectQuantity = 1;
        let projectRate = 0;
        const jobPrice = curRec.getValue("jobprice") * 1;
        const billingscheduleId = curRec.getValue("billingschedule");

        if(billingscheduleId){
            const billingscheduleRec = record.load({type: "billingschedule", id: billingscheduleId});
            const sizeMileStone = billingscheduleRec.getLineCount("milestone");
            const initialamount = billingscheduleRec.getValue("initialamount")?.toString().replace("%", "") / 100;

            if(initialamount > 0){
                projectQuantity = sizeMileStone + 1;
            }
            else{
                projectQuantity = sizeMileStone;
            }
        }

        projectRate = projectQuantity === 0 ? 0 : constFormat.roundNumber(jobPrice/projectQuantity, 8);

        curRec.setValue("custentity_scv_project_quantity", projectQuantity);
        curRec.setValue("custentity_scv_project_rate", projectRate);
    }

    return {
        addBtnCalcNetCost,
        calcNetCost,

        autoCalcProject,
    };

});
