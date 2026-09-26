/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Thanh Hoan              Init, create file, PO (ID), from mr.Quân(https://app.clickup.com/t/3773072/86d3w9emj)
 */
define([
    "N/record", "N/url", 'N/runtime', 'N/search',
    "../lib/scv_lib_pdf.js",
    '../common/scv_common_ext_performent.js',

    '../cons/scv_cons_format.js',

], (
        record, url, runtime,search,
        libPdf,
        commonExtPerformance,

        constFormat,

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
                label: "Working budget",
                functionName: "window.open('" + urlScript + "');"
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
            let primaryCurrency = currency.getValue("formatsample");
            let projectLocation = curRec.getValue("custentity_pc_location");
            let client = curRec.getText("parent");

            let consultantArchitects = "";
            let consultantStructure = "";
            let consultantME = "";
            let consultantLandscape = "";
            let consultantID = "";
            let consultantQS = "";

            let consultantTypeId = curRec.getSublistValue({
                sublistId: "recmachcustrecord_scv_p_project_related",
                fieldId: "custrecord_scv_p_consultant_type",
                line: 0
            });

            if (consultantTypeId) {
                let consultantRec = record.load({
                    type: "customrecord_scv_project_consultant",
                    id: consultantTypeId
                });

                let consultantType = consultantRec.getText("custrecord_scv_p_consultant_type") || '';
                let consultant = consultantRec.getText("custrecord_scv_p_consultant") || "";

                // log.error("hoan chek consultantType", consultantType);
                // log.error("hoan chek consultant", consultant);

                if (consultantType === "Architects") {
                    consultantArchitects = consultant;
                } else if (consultantType === "Structure") {
                    consultantStructure = consultant;
                } else if (consultantType === "M&E") {
                    consultantME = consultant;
                } else if (consultantType === "Landscape") {
                    consultantLandscape = consultant;
                } else if (consultantType === "ID") {
                    consultantID = consultant;
                } else if (consultantType === "QS") {
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
            let projectGeneralManager = curRec.getText("custentity_scv_p_project_gm") || '';
            let projectManager = curRec.getText("projectmanager") || '';
            let assistProjectManager = curRec.getText("custentity_scv_p_assistant_pm") || '';
            let indirectExpenses = curRec.getValue("custentity_scv_project_idr_cost_reserve") || 0;

            let indirectExpensesPer = (indirectExpenses * 1) != 0 ? (indirectExpenses * 1) / (contractSum * 1) : 0;

            let totalProfitPer = (totalProfit * 1) / (contractSum * 1);
            let overheadPer = (overhead * 1) / (contractSum * 1);
            let profitAttendancePer = (profitAttendance * 1) / (contractSum * 1);
            let awardProfitPer = (awardProfit * 1) / (contractSum * 1);
            let pcSumProvSumPer = (pcSumProvSum * 1) / (contractSum * 1);

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
            objResult.tagImgLogo  =  libPdf.createImageBySubsidiaryV2(subsidiaryRec, 120),
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
        return { addBtnPrint, generateFilePDF };
    });
