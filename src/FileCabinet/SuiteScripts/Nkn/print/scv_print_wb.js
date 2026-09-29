/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  26 Sep 2026         Thanh Hoan              Add button Working budget, trên màn hình project from mrs. P.Anh(https://app.clickup.com/t/3773072/14yhnhmfz2e)
 */
define([
    "N/record", "N/url", 'N/runtime', 'N/search', 'N/file',
    "../lib/scv_lib_pdf.js",
    '../common/scv_common_ext_performent.js',

    '../cons/scv_cons_format.js',
    '../cons/scv_cons_consultant_type_list.js',
    '../cons/scv_cons_job_resource_role.js',

], (
        record, url, runtime,search, file,
        libPdf,
        commonExtPerformance,

        constFormat,
        constConsultantType,
        constRole
    ) => {



        const addBtnPrint = (scriptContext, curRec) => {

            let form = scriptContext.form;
            
            let urlScript = url.resolveScript({
                scriptId: 'customscript_scv_sl_print',
                deploymentId: 'customdeploy_scv_sl_print',
                params: {
                    recordId: curRec.id,
                    recordType: curRec.type,
                    printFile: "scv_print_wb",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_wb_pdf",
                label: "Working budget (PDF) ",
                functionName: "window.open('" + urlScript + "');"
            });

            let urlScriptXls = url.resolveScript({
                scriptId: 'customscript_scv_sl_print',
                deploymentId: 'customdeploy_scv_sl_print',
                params: {
                    recordId: curRec.id,
                    recordType: curRec.type,
                    printFile: "scv_print_wb",
                    printFileScript: "scv_print_script_wb_xls",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_wb_excel",
                label: "Working budget (excel) ",
                functionName: "window.open('" + urlScriptXls + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_wb");
            let curRec = record.load({ type: _params.recordType, id: _params.recordId });


            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_wb");

            return filePDF;
        };

        const rennderPDF = (curRec) => {
            const renderer = libPdf.renderTemplateWithXml("scv_print_wb");
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});
            let projectNo = curRec.getValue("entityid");
            let projectName = curRec.getValue("companyname");
            let currency = record.load({type: "currency", id: curRec.getValue("currency")});
            let primaryCurrency = currency.getValue("symbol");
            let projectLocation = curRec.getValue("custentity_pc_location");
            let client = curRec.getText("parent");

            let consultantArchitects = "";
            let consultantStructure = "";
            let consultantME = "";
            let consultantLandscape = "";
            let consultantID = "";
            let consultantQS = "";

            const lineCount = curRec.getLineCount({
                sublistId: "recmachcustrecord_scv_p_project_related"
            });

            for (let i = 0; i < lineCount; i++) {
                let consultantId = curRec.getSublistValue({
                    sublistId: "recmachcustrecord_scv_p_project_related",
                    fieldId: "id",
                    line: i
                });

                if (!consultantId) continue;

                let consultantRec = record.load({
                    type: "customrecord_scv_project_consultant",
                    id: consultantId
                });

                let consultantTypeId = consultantRec.getValue("custrecord_scv_p_consultant_type") || "";
                let consultant = consultantRec.getText("custrecord_scv_p_consultant") || "";

                if (consultantTypeId == constConsultantType.Records.Architects.ID) {
                    consultantArchitects = consultant;
                } else if (consultantTypeId == constConsultantType.Records.Structure.ID) {
                    consultantStructure = consultant;
                } else if (consultantTypeId == constConsultantType.Records.ME.ID) {
                    consultantME = consultant;
                } else if (consultantTypeId == constConsultantType.Records.Landscape.ID) {
                    consultantLandscape = consultant;
                } else if (consultantTypeId == constConsultantType.Records.ID.ID) {
                    consultantID = consultant;
                } else if (consultantTypeId == constConsultantType.Records.QS.ID) {
                    consultantQS = consultant;
                }
            }
            let constructionPeriodStart = curRec.getValue("startdate");
            let constructionPeriodEnd = curRec.getValue("enddate");

            const formatDate = (dateValue) => {
                if (!dateValue) return '';
                let date = new Date(dateValue);
                return `${String(date.getDate()).padStart(2, '0')} ${date.toLocaleString('en-US', {month: 'short'})} ${date.getFullYear()}`;
            };

            let constructionPeriodStartFormatted = formatDate(constructionPeriodStart);
            let constructionPeriodEndFormatted = formatDate(constructionPeriodEnd);

            let constructionPeriodMonths = '';

            if (constructionPeriodStart && constructionPeriodEnd) {
                let start = new Date(constructionPeriodStart);
                let end = new Date(constructionPeriodEnd);
                constructionPeriodMonths = `${(end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())} mths`;
            }

            let defectsLiabilityPeriod = curRec.getValue("custentity_scv_p_defect_liability_period");
            let typeOfContract = curRec.getText("jobtype");
            let modeOfPayment = curRec.getValue("custentity_scv_p_mode_of_payment");
            let retention = curRec.getValue("custentity_scv_p_retention");
            let typeOfBuilding = curRec.getValue("custentity_scv_p_type_of_building");
            let structure = curRec.getValue("custentity_scv_p_structure");
            let basementCarparkArea = curRec.getValue("custentity_scv_p_base_carp_area");
            let gfa = curRec.getValue("custentity_scv_p_gfa") || 0;
            let cfa = curRec.getValue("custentity_scv_p_cfa") || 0;
            let piling = curRec.getValue("custentity_scv_p_pilling");
            let concrete = curRec.getValue("custentity_scv_p_concrete");
            let rebar = curRec.getValue("custentity_scv_p_rebar");
            let wireMesh = curRec.getValue("custentity_scv_p_wire_mesh");
            let formworks = curRec.getValue("custentity_scv_p_formworks");
            let steelStructure = curRec.getValue("custentity_scv_p_steel_structure");
            let contractSum = curRec.getValue("jobprice") || 0;
            let constructionNetCost = curRec.getValue("custentity_scv_p_net_cost") || 0;
            let totalProfit = curRec.getValue("custentity_scv_p_total_profit") || 0;
            let overhead = curRec.getValue("custentity_scv_overhead_amt") || 0;
            let profitAttendance = curRec.getValue("custentity_scv_profit_attendance") || 0;
            let awardProfit = curRec.getValue("custentity_scv_p_arward_profit") || 0;
            let pcSumProvSum = curRec.getValue("custentity_scv_p_pc_prov_sum") || 0;
           
            let projectGeneralManager = "";
            let projectManager = "";
            let assistProjectManager = "";

            let lineCountJob = curRec.getLineCount({
                sublistId: "jobresources"
            });

            for (let i = 0; i < lineCountJob; i++) {
                let roleId = curRec.getSublistValue({
                    sublistId: "jobresources",
                    fieldId: "role",
                    line: i
                });

                if (!roleId) continue;

                let employeeId = curRec.getSublistValue({
                    sublistId: "jobresources",
                    fieldId: "jobresource",
                    line: i
                });

                if (!employeeId) continue;

                let employeeName = curRec.getSublistText({
                    sublistId: "jobresources",
                    fieldId: "jobresource",
                    line: i
                }) || "";

                if (roleId == constRole.Records.ProjectGenManager.ID) {
                    projectGeneralManager = employeeName;
                } else if (roleId == constRole.Records.ProjectManager.ID) {
                    projectManager = employeeName;
                } else if (roleId == constRole.Records.AssistProjectManager.ID) {
                    assistProjectManager = employeeName;
                }
            }
            let indirectExpenses = curRec.getValue("custentity_scv_project_idr_cost_reserve") || 0;

            let indirectExpensesPer = (indirectExpenses * 1) != 0 ? (indirectExpenses * 1) / (contractSum * 1) : 0;

            let totalProfitPer = ((totalProfit * 1) / (contractSum * 1) * 100).toFixed(2);
            
            let overheadPer = ((overhead * 1) / (contractSum * 1) * 100).toFixed(2);

            let profitAttendancePer = ((profitAttendance * 1) / (contractSum * 1) * 100).toFixed(2);

            let awardProfitPer = ((awardProfit * 1) / (contractSum * 1) * 100).toFixed(2);

            let pcSumProvSumPer = ((pcSumProvSum * 1) / (contractSum * 1) * 100).toFixed(2);

            let contractSumByGFA = (contractSum * 1) / (gfa * 1) ;
            let contractSumByCFA =  (contractSum * 1) / (cfa * 1) ;
            let netCostByCFA =  (constructionNetCost * 1) / (cfa * 1) ;

            let objResult = {
                projectNo: projectNo || '',
                projectName: projectName || '',
                primaryCurrency : primaryCurrency || '',
                siteLocation: projectLocation || '',
                client: client || '',
                consultantArchitects: consultantArchitects || '',
                consultantStructure: consultantStructure || '',
                consultantME: consultantME || '',
                consultantLandscape: consultantLandscape || '',
                consultantID: consultantID || '',
                consultantQS: consultantQS || '',
                constructionPeriodStart: constructionPeriodStartFormatted || '',
                constructionPeriodEnd: constructionPeriodEndFormatted || '',
                constructionPeriodMonths: constructionPeriodMonths || '',
                defectsLiabilityPeriod: defectsLiabilityPeriod || '',
                typeOfContract: typeOfContract || '',
                modeOfPayment: modeOfPayment || '',
                retention: retention || '',
                typeOfBuilding: typeOfBuilding || '',
                structure: structure || '',
                basementCarparkArea: basementCarparkArea || '',
                gfa: gfa || '',
                cfa: cfa || '',
                piling: piling || '',
                concrete: concrete || '',
                rebar: rebar || '',
                wireMesh: wireMesh || '',
                formworks: formworks || '',
                steelStructure: steelStructure || '',
                contractSum: contractSum || '',
                constructionNetCost: constructionNetCost || '',
                totalProfit: totalProfit || '',
                totalProfitPer: totalProfitPer || '',
                overhead: overhead || '',
                overheadPer: overheadPer || '',
                profitAttendance: profitAttendance || '',
                profitAttendancePer: profitAttendancePer || '',
                awardProfit: awardProfit || '',
                awardProfitPer: awardProfitPer || '',
                pcSumProvSum: pcSumProvSum || '',
                pcSumProvSumPer: pcSumProvSumPer || '',
                contractSumByGFA: contractSumByGFA || '',
                contractSumByCFA: contractSumByCFA || '',
                netCostByCFA: netCostByCFA || '',
                projectGeneralManager: projectGeneralManager || '',
                projectManager: projectManager || '',
                assistProjectManager: assistProjectManager || '',
                indirectExpenses: indirectExpenses || '',
                indirectExpensesPer: indirectExpensesPer || ''
            };

            objResult.contractSum = formatNumberByKey(objResult.contractSum);
            objResult.constructionNetCost = formatNumberByKey(objResult.constructionNetCost);
            objResult.totalProfit = formatNumberByKey(objResult.totalProfit);
            objResult.overhead = formatNumberByKey(objResult.overhead);
            objResult.profitAttendance = formatNumberByKey(objResult.profitAttendance);
            objResult.awardProfit = formatNumberByKey(objResult.awardProfit);
            objResult.pcSumProvSum = formatNumberByKey(objResult.pcSumProvSum);
            objResult.contractSumByGFA = formatNumberByKey(objResult.contractSumByGFA);
            objResult.contractSumByCFA = formatNumberByKey(objResult.contractSumByCFA);
            objResult.netCostByCFA = formatNumberByKey(objResult.netCostByCFA);
            objResult.indirectExpenses = formatNumberByKey(objResult.indirectExpenses);

            libPdf.formatDataXMLWithObject(objResult);
            objResult.tagImgLogo  =  libPdf.createImageBySubsidiaryV2(subsidiaryRec, 50),
            renderer.addCustomDataSource({
                format: "OBJECT",
                alias: 'result',
                data: objResult
            });

            return renderer;
        };     

        const formatNumberByKey = (_number) =>{
            return constFormat.formatNumber(_number, 2, {
                groupSeparator: ',',
                decimalSeparator: '.',
            });
        } 

        const getDataSource = () =>{
            return {
                urlTmpl: file.load("../xlsx/scv_tmpl_wbs_import.xlsx").url,
                header: {
                    subsidiary: "ok"
                },
                lines: [{
                    a: 1, b: 1, c: 1
                }],
            }
        }

        return { addBtnPrint, generateFilePDF, getDataSource};
    });
