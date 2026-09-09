/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  27 Aug 2026         Huy Pham			    Init, create file, PMP_WBS Import, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d453pe8)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/record', 'N/file',
    '../common/scv_common_wbs_import.js',

    '../cons/scv_cons_form.js',
    '../cons/scv_cons_format.js',
],
    
    (runtime, record, file,
        commonWbsImport,
        constForm,
        constFormat,
    ) => {
        const CurrentScript = {
            ID: "customscript_scv_sl_wbs_import",
            DEPLOYID_UI: "customscript_scv_sl_wbs_import",
            DEPLOYID_DATA: "customdeploy_scv_sl_wbs_import_svc"
        }

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            constForm.setContext(scriptContext);
            constForm.setServiceScript(CurrentScript.ID, CurrentScript.DEPLOYID_DATA);

            let request = scriptContext.request;
            let params = request.parameters;

            let curScript = runtime.getCurrentScript();

            if(curScript.deploymentId == CurrentScript.DEPLOYID_DATA){
                let objResponse = {data: []};
        
				switch(params.action){
					case "getDataSource":
						objResponse.data = getDataSource(params);
						break;
                    case "uploadResult":
						objResponse.data = uploadResult(params);
						break;
                    case "submitResult":
                        objResponse.data = submitResult(params);
                        break;
				}

				constForm.write(objResponse);
            }else{
                if(request.method == "GET"){
                    createFormUI(params);
                    
                    constForm.writePage();
                }
            }
        }

        const createFormUI = (_params) =>{
            constForm.createForm("Import WBS", '../cssl/scv_cs_sl_wbs_import.js',{
                pagination: true
            });

            constForm.addPageLink([], true);

            let fileDownloadUrl = file.load({id: '../xlsx/scv_tmpl_wbs_import.xlsx'})?.url ?? "";

            constForm.addButton({id: "custpage_btn_submit", label: "Submit", functionName: "submitResult()"}, {
                styleSubmit: true
            });
            constForm.addButton({id: "custpage_btn_upload", label: "Upload File", functionName: "uploadResult()"},);
            constForm.addButton({id: "custpage_btn_download", label: "Template Import", functionName: "downloadTemplate('" + fileDownloadUrl + "')"},);

            if(!_params.custpage_wbs_timelinetype){
                _params.custpage_wbs_timelinetype = commonWbsImport.Stores.TimeLineType.Global.ID;
            }

            let infoGroup = constForm.addFieldGroup({id: "fieldgrp_info", label: "Information"});

            constForm.addField({
                id: 'custpage_project', label: 'Project',
                type: "select", source: "job",
                container: infoGroup.id
            }, true, {
                defaultValue: _params.custpage_project
            });

            let wbsTab = constForm.addTab({id: "tab_wbs", label: "Work Breakdown Structure" })
            let scheduleTab = constForm.addTab({id: "tab_schhedule", label: "Schedule" });

            constForm.addField({
                id: 'custpage_wbs_description', label: 'Description',
                type: "text", 
                container: wbsTab.id
            }, false, {
                defaultValue: _params.custpage_wbs_description
            });

            constForm.addField({
                id: 'custpage_wbs_timelinetype', label: 'TimelineType',
                type: "select", 
                container: wbsTab.id
            }, true, {
                lookup: {
                    data: commonWbsImport.getTimeLineTypes(),
                    valueExpr: "ID", displayExpr: "NAME"
                },
                defaultValue: _params.custpage_wbs_timelinetype
            });

            constForm.addField({
                id: 'custpage_wbs_startdate', label: "Start Date",
                type: "date",
                container: wbsTab.id
            }, true, {
                layoutType: "startrow",
                defaultValue: _params.custpage_wbs_startdate
            });

            constForm.addField({
                id: 'custpage_wbs_enddate', label: "End Date",
                type: "date",
                container: wbsTab.id
            }, true, {
                layoutType: "endrow",
                defaultValue: _params.custpage_wbs_enddate
            });

            let wbsLinesSublist = constForm.addSublist({
                id: "custpage_wbs_lines",
                type: "LIST",
                label : "Work Breakdown Structure Lines",
                tab: wbsTab.id,
                columns: commonWbsImport.getColumnsWbsLines(_params),
                pagination: {
                    pageSize: 500,
                    pageLabel: "custpage_col_name"
                },
                treeList: {
                    enable: true,
                    autoExpandAll: true,
                    rootValue: "",
                    keyExpr: "custpage_col_key",
                    parentIdExpr: "custpage_col_parentkey",
                }
            });

            constForm.addSublist({
                id: "custpage_sl_tasks",
                type: "LIST",
                label : "Project Tasks/Milestones",
                tab: scheduleTab.id,
                columns: commonWbsImport.getColumnsTask(),
                pagination: {
                    pageSize: 500,
                    pageLabel: "custpage_col_name"
                },
                treeList: {
                    enable: true,
                    autoExpandAll: true,
                    rootValue: "",
                    keyExpr: "id",
                    parentIdExpr: "parent",
                }
            });
        }

        const getDataSource = (_params) => {
            let objResult = {
                custpage_wbs_description: "",
                custpage_wbs_timelinetype: "",
                custpage_wbs_startdate: "",
                custpage_wbs_enddate: "",
                custpage_sl_tasks: [],
                custpage_wbs_lines: [],
            };
            if(!_params.custpage_project) return objResult;

            let projectRec = record.load({type: "job", id: _params.custpage_project});

            objResult.custpage_sl_tasks = commonWbsImport.getDataProjectTask(_params);

            let wbsRecId = projectRec.getValue("wbs");

            if(!wbsRecId) return objResult;

            let wbsRec = record.load({type: "wbs", id: wbsRecId, isDynamic: true});

            objResult.custpage_wbs_description = wbsRec.getValue("description");
            objResult.custpage_wbs_timelinetype = wbsRec.getValue("timelinetype");
            objResult.custpage_wbs_startdate = wbsRec.getText("startdate") ?? "";
            objResult.custpage_wbs_enddate = wbsRec.getText("enddate") ?? "";

            return objResult;
        }

        const uploadResult = (_params) => {
            let arrResult = [];

            let fromMonth = (new Date()).getMonth();
            let fromYear = (new Date()).getFullYear();

            if(_params.custpage_wbs_timelinetype === commonWbsImport.Stores.TimeLineType.Monthly.ID){
                if(_params.custpage_wbs_startdate){
                    fromMonth = constFormat.getMM(_params.custpage_wbs_startdate) * 1 - 1;
                    fromYear = constFormat.getYYYY(_params.custpage_wbs_startdate) * 1;
                }
            }

            let sizeParent = constFormat.randomNumberBetween(1, 5);

            for(let i = 1; i <= sizeParent; i++){
                let objRes = {
                    custpage_col_key: i,
                    custpage_col_parentkey: "",
                    custpage_col_seqnum: i,
                    custpage_col_name: "Name parent " + i,
                    custpage_col_projecttask: "",
                    custpage_col_date: constFormat.formatDate(new Date(fromYear, fromMonth, constFormat.randomNumberBetween(1, 28))),
                    custpage_col_etc_cost: 0,
                    custpage_col_etc_revenue: 0,
                };

                arrResult.push(objRes);

                let sizeChild = constFormat.randomNumberBetween(0, 5);
                for(let j = 1; j <= sizeChild; j++){
                    let objResChild = {
                        custpage_col_key: i + "." + j,
                        custpage_col_parentkey: objRes.custpage_col_key,
                        custpage_col_seqnum: i + "." + j,
                        custpage_col_name: "Name Child " + i + "." + j,
                        custpage_col_projecttask: "",
                        custpage_col_date: constFormat.formatDate(new Date(fromYear, fromMonth, constFormat.randomNumberBetween(1, 28))),
                        custpage_col_etc_cost: 0,
                        custpage_col_etc_revenue: 0,
                    };

                    arrResult.push(objResChild);

                    let sizeChild2 = constFormat.randomNumberBetween(0, 5);
                    for(let z = 1; z <= sizeChild2; z++){
                        let objResChild2 = {
                            custpage_col_key: i + "." + j + "." + z,
                            custpage_col_parentkey: objResChild.custpage_col_key,
                            custpage_col_seqnum: i + "." + j + "." + z,
                            custpage_col_name: "Name Child  " + i + "." + j + "." + z,
                            custpage_col_projecttask: "",
                            custpage_col_date: constFormat.formatDate(new Date(fromYear, fromMonth, constFormat.randomNumberBetween(1, 28))),
                            custpage_col_etc_cost: constFormat.randomNumberBetween(0, 1000000),
                            custpage_col_etc_revenue: constFormat.randomNumberBetween(0, 1000000),
                        };

                        arrResult.push(objResChild2);

                        objResChild.custpage_col_etc_cost += objResChild2.custpage_col_etc_cost;
                        objResChild.custpage_col_etc_revenue += objResChild2.custpage_col_etc_revenue;
                    }

                    objRes.custpage_col_etc_cost += objResChild.custpage_col_etc_cost;
                    objRes.custpage_col_etc_revenue += objResChild.custpage_col_etc_revenue;
                }
            }

            return arrResult;
        }

        const submitResult = (_params) =>{
            let objResponse = {
                success: true,
                msg: "Success.",
                internalid: "",
            };

            let arrLine = !!_params.arrLine ? JSON.parse(_params.arrLine) : [];
            if(arrLine.length == 0){
                objResponse.success = false;
                objResponse.msg = "Chọn ít nhất 1 line để submit";

                return objResponse;
            }

            try{
                let arrResLines = commonWbsImport.prepareResultLines(_params, arrLine);

                objResponse.internalid = commonWbsImport.createWbs(_params, arrResLines);
            }
            catch(err){
                objResponse.success = false;
                objResponse.msg = err.message;
            }

            return objResponse;
        }

        return {onRequest}

    });
