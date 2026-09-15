/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Huy Pham                Init, create file. Create RPO (Requisition) from Project_WBS, from ms.Ngọc(https://app.clickup.com/t/3773072/14yhnhmfjj0)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime',

    '../cons/scv_cons_form.js',
    '../cons/scv_cons_format.js',
    '../cons/scv_cons_queue_job.js',

    '../common/scv_common_wbs2rpo.js',
],

    (runtime,

        constForm,
        constFormat,
        constQueueJob,

        commonWbs2Rpo,
    ) => {
        const CurrentScript = {
            ID: "customscript_scv_sl_wbs2rpo",
            DEPLOYID_UI: "customdeploy_scv_sl_wbs2rpo",
            DEPLOYID_DATA: "customdeploy_scv_sl_wbs2rpo_svc"
        };
        const JobScript = {
            TYPE: "MAP_REDUCE",
            ID: "customscript_scv_mr_wbs2rpo",
            DEPLOYID: "customdeploy_scv_mr_wbs2rpo",
            PARAMSID: "custscript_scv_mr_wbs2rpo_params"
        };

        const onRequest = (scriptContext) => {
            constForm.setContext(scriptContext);
            constForm.setServiceScript(CurrentScript.ID, CurrentScript.DEPLOYID_DATA);

            constQueueJob.setInfoJobScript(JobScript.TYPE, JobScript.ID, JobScript.DEPLOYID, JobScript.PARAMSID);

            let request = scriptContext.request;
            let params = request.parameters;

            let curScript = runtime.getCurrentScript();

            if(curScript.deploymentId == CurrentScript.DEPLOYID_DATA){
                let objResponse = {data: []};

				switch(params.action){
                    case "submitResult":
                        objResponse.data = submitResult(params);
                        break;
				}

				constForm.write(objResponse);
            }else{
                if(request.method == "GET"){
                    onCreateFormUI(params);

                    constForm.writePage();
                }
            }
        }

        const onCreateFormUI = (_params) =>{
            constForm.createForm("Create Request Purchase Order from WBS", '../cssl/scv_cs_sl_wbs2rpo.js');

            constForm.addPageLink(commonWbs2Rpo.getListSavedSearch(), true);

            constForm.addButton({id: "custpage_btn_search", label: "Search", functionName: "searchResult()"},);

            constForm.addButton({id: "custpage_btn_submit", label: "Create RPO", functionName: "submitResult()"}, {
                styleSubmit: true
            });

            let objPopupQueue = constQueueJob.getPopupQueueJobStatusScript();
            constForm.addButton({
                id: "custpage_btn_queue",
                label: "Queue Status",
                functionName: `openStatusQueue('${objPopupQueue.url}', ${objPopupQueue.width}, ${objPopupQueue.height}, '${objPopupQueue.title}')`
            });

            let mainGrp = constForm.addFieldGroup({id: "fieldgrp_filter", label: "Filter"});
            let defaultGrp = constForm.addFieldGroup({id: "fieldgrp_default", label: "Default value for RPO"});

            //#region Tab Filter
            constForm.addField({
                id: 'custpage_subsidiary', label: "Subsidiary",
                type: "select", source: "subsidiary",
                container: mainGrp.id
            }, true, {
                defaultValue: !!_params.custpage_subsidiary ? _params.custpage_subsidiary.split(",") : ""
            });

            constForm.addField({
                id: 'custpage_project', label: "Project",
                type: "select", source: "job",
                container: mainGrp.id
            }, true, {
                defaultValue: !!_params.custpage_project ? _params.custpage_project.split(",") : ""
            });

            constForm.addField({
                id: 'custpage_employee', label: "Project Manager",
                type: "select", source: "employee",
                container: mainGrp.id
            }, false, {
                defaultValue: !!_params.custpage_employee ? _params.custpage_employee.split(",") : ""
            });

            constForm.addField({
                id: 'custpage_def_vendor', label: "Vendor",
                type: "select", source: "vendor",
                container: defaultGrp.id
            }, false, {
                defaultValue: !!_params.custpage_def_vendor ? _params.custpage_def_vendor.split(",") : ""
            });

            constForm.addField({
                id: 'custpage_def_currency', label: "Currency",
                type: "select", source: "currency",
                container: defaultGrp.id
            }, false, {
                defaultValue: !!_params.custpage_def_currency ? _params.custpage_def_currency.split(",") : ""
            });

            constForm.addField({
                id: 'custpage_def_scopeofwork', label: "Scope of work",
                type: "text", 
                container: defaultGrp.id
            }, false, {
                defaultValue: _params?.custpage_def_scopeofwork
            });
            //#endregion

            let resultSublist = constForm.addSublist({
                id: "custpage_sl_result",
                type: "LIST",
                label : "Result",
                columns: [
                    {
                        id: "custpage_col_chk", label: "Select", type: "checkbox"
                    },
                    {
                        id: "custpage_col_projectcode", label: "Project Code", type: "text"
                    },
                    {
                        id: "custpage_col_workitemcode", label: "Work Item Code", type: "text"
                    },
                    {
                        id: "custpage_col_item", label: "Item", type: "text"
                    },
                    {
                        id: "custpage_col_description", label: "Description", type: "text"
                    },
                    {
                        id: "custpage_col_classcode", label: "Class Code", type: "text"
                    },
                    {
                        id: "custpage_col_unit", label: "Unit", type: "text"
                    },
                    {
                        id: "custpage_col_rpo_qty", label: "RPO Quantity", type: "float"
                    },
                    {
                        id: "custpage_col_rpo_rate", label: "RPO Rate", type: "float"
                    },
                    {
                        id: "custpage_col_rpt_tax", label: "RPO Tax", type: "text"
                    },
                    {
                        id: "custpage_col_vendor", label: "Vendor", type: "text"
                    },
                    {
                        id: "custpage_col_rpo_amount", label: "RPO Amount", type: "float"
                    },
                    {
                        id: "custpage_col_rpo_taxamount", label: "RPO Tax Amount", type: "float"
                    },
                    {
                        id: "custpage_col_wbs_qty", label: "WBS Quantity", type: "float"
                    },
                    {
                        id: "custpage_col_linekey", label: "Line Key", type: "text"
                    },
                ],
            });

            resultSublist.addMarkAllButtons();

            if(_params.isSearch === "T"){
                let arrResult = commonWbs2Rpo.getDataSource(_params);

                constForm.setDataOfSublist("custpage_sl_result", arrResult);
            }
        }

        const submitResult = (_params) =>{
            let objResponse = {
                success: true,
                msg: "Success."
            };

            try{
                let arrResult = [];

                if(arrResult.length <= 30){

                    objResponse.msg = "Success: " + arrResult.length + " (Records)";
                }
                else{
                    constQueueJob.createQueueJobScript(JSON.stringify({
                        custpage_bz_org: _params.custpage_bz_org,
                        custpage_wbs2rpo: _params.custpage_wbs2rpo,
                        custpage_bz_vendor: _params.custpage_bz_vendor,
                        custpage_fromdt: _params.custpage_fromdt,
                        custpage_todt: _params.custpage_todt,
                    }));
                    constQueueJob.processQueueJobScript();
                }
            }
            catch(err){
                log.error("Error: Try.catch.submitResult", err)
                objResponse.success = false;
                objResponse.msg = err.message;
            }

            return objResponse;
        }

        return {
            onRequest,
        }

    });
