/**
 * Nội dung: 
 * Mapping:
 * =======================================================================================
 *  Date                Author                  Description
 *  18 Sep 2026         Huy Pham                Init, create file. Tính toán Net Cost trên Project tab Financial, from mr.Bính (https://app.clickup.com/t/3773072/14yhnhmfqr2)
 */
define(['N/url', 'N/record', 'N/runtime',

    '../cons/scv_cons_search_project_net_cost.js',
],(url, record, runtime,

    constSearchProjectNetCost,
) => {

    const addBtnCalcNetCost = (scriptContext) => {
        if(runtime.executionContext !== runtime.ContextType.USER_INTERFACE) return;

        if(scriptContext.type !== "view") return;

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

    const calcNetCost = (params) => {
        let projectRecId = params.recordId;

        let netCost = 0;

        if(projectRecId){
            let arrResult = constSearchProjectNetCost.getDataSource({
                project: projectRecId
            });
            
            netCost = (arrResult[0]?.budget_eac ?? 0) * 1;
        }
        
        record.submitFields({
            type: "job", id: projectRecId,
            values: {
                custentity_scv_p_net_cost: netCost
            },
            options: {
                enableSourcing: false, ignoreMandatoryFields: true
            }
        });

        return netCost;
    }

    return {
        addBtnCalcNetCost,
        calcNetCost,
    };

});
