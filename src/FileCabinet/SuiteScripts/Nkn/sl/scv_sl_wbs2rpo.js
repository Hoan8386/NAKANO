/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Huy Pham                Init, create file. Create RPO (Requisition) from Project_WBS, from ms.Ngọc(https://app.clickup.com/t/3773072/14yhnhmfjj0)
 *  23 Sep 2026         Huy Pham                Bổ sung logic Tax Code, from ms.Ngọc(https://app.clickup.com/t/3773072/14yhnhmfjj0?comment=1300230000034947)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/search',

    '../cons/scv_cons_form.js',
    '../cons/scv_cons_search.js',

    '../common/scv_common_wbs2rpo.js',
],

    (runtime, search,

        constForm,
        constSearch,

        commonWbs2Rpo,
    ) => {
        const CurrentScript = {
            ID: "customscript_scv_sl_wbs2rpo",
            DEPLOYID_UI: "customdeploy_scv_sl_wbs2rpo",
            DEPLOYID_DATA: "customdeploy_scv_sl_wbs2rpo_svc"
        };

        const onRequest = (scriptContext) => {
            constForm.setContext(scriptContext);
            constForm.setServiceScript(CurrentScript.ID, CurrentScript.DEPLOYID_DATA);

            let request = scriptContext.request;
            let params = request.parameters;

            let curScript = runtime.getCurrentScript();

            if(curScript.deploymentId == CurrentScript.DEPLOYID_DATA){
                let objResponse = {data: []};

				switch(params.action){
                    case "getVendors":
                        objResponse.data = commonWbs2Rpo.getVendors(params);
                        break;
                    case "getSalesTaxItem":
                        objResponse.data = commonWbs2Rpo.getSalesTaxItem(params);
                        break;
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
            let curUser = runtime.getCurrentUser();

            constForm.createForm("Create Request Purchase Order from WBS", '../cssl/scv_cs_sl_wbs2rpo.js', {
                pagination: true
            });

            constForm.addPageLink(commonWbs2Rpo.getListSavedSearch(), true);

            constForm.addButton({id: "custpage_btn_search", label: "Search", functionName: "searchResult()"},);

            constForm.addButton({id: "custpage_btn_submit", label: "Create RPO", functionName: "submitResult()"}, {
                styleSubmit: true
            });

            let mainGrp = constForm.addFieldGroup({id: "fieldgrp_filter", label: "Filter"});
            let defaultGrp = constForm.addFieldGroup({id: "fieldgrp_default", label: "Default value for RPO"});

            if(!_params.custpage_subsidiary){
                _params.custpage_subsidiary = curUser.subsidiary.toString();
            }

            commonWbs2Rpo.initParamsDefault(_params);

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
                type: "select", 
                container: mainGrp.id
            }, false, {
                lookup: {
                    data: getEmployees(_params),
                    valueExpr: "internalid",
                    displayExpr: "name",
                },
                defaultValue: !!_params.custpage_employee ? _params.custpage_employee.split(",") : ""
            });

            constForm.addField({
                id: 'custpage_def_vendor', label: "Vendor",
                type: "select", 
                container: defaultGrp.id
            }, false, {
                lookup: {
                    data: commonWbs2Rpo.getVendors(_params),
                    valueExpr: "internalid",
                    displayExpr: "name",
                },
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

            constForm.addField({
                id: 'custpage_def_taxcode', label: "Tax code",
                type: "select", 
                container: defaultGrp.id
            }, false, {
                lookup: {
                    data: commonWbs2Rpo.getSalesTaxItem(_params),
                    valueExpr: "internalid",
                    displayExpr: "name",
                },
                defaultValue: _params?.custpage_def_taxcode
            });
            //#endregion

            let resultSublist = constForm.addSublist({
                id: "custpage_sl_result",
                type: "LIST",
                label : "Result",
                columns: commonWbs2Rpo.getColumns(_params),
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
                msg: "Success.",
                internalid: "",
                url: "",
            };

            try{
                let arrResult = _params.arrLines ? JSON.parse(_params.arrLines) : [];

                objResponse.internalid = commonWbs2Rpo.createRPO(_params, arrResult);

                if(objResponse.internalid){
                    objResponse.url = `/app/accounting/transactions/purchreq.nl?id=${objResponse.internalid}`;

                    let tranid = search.lookupFields({
                        type: "purchaserequisition", id: objResponse.internalid, columns: "tranid"
                    }).tranid;

                    objResponse.msg = `Success: <a href="${objResponse.url}" target="_blank">${tranid}</a>`;
                }
                
            }
            catch(err){
                log.error("Error: Try.catch.submitResult", err)
                objResponse.success = false;
                objResponse.msg = err?.message || err;
            }

            return objResponse;
        }

        const getEmployees = (_params) => {
            let filters = [];

            let resultSearch =  constSearch.createSearchWithFilter({
                type: "employee",
                filters: [
                    ["isinactive","is","F"],
                    "AND",
                    ["isjobresource","is","T"]
                ],
                columns: [
                    "internalid", 
                    "entityid"
                ]
            }, filters);
            
            resultSearch = resultSearch.runPaged({pageSize: 1000});

            let arrResult = constSearch.fetchResultSearchAllPage(resultSearch, function(_objTmpl, _column){
                return constSearch.getObjResultFromSearchByKey(_objTmpl, _column, [
                    "internalid", "name"
                ]);
            });
            
            return arrResult;
        }

        return {
            onRequest,
        }

    });
