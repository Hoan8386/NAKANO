/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Sep 2026         Thanh Hoan              Init, create file, RPO (TH), from mr.Quân(https://app.clickup.com/t/3773072/86d3w9a1h)
 */
define([
    "N/record", "N/url", 'N/search', 'N/query', 'N/file', 'N/runtime',
    '../olib/alasql/alasql.min@4.6.6.js', 
    "../lib/scv_lib_pdf.js",
    '../lib/scv_lib_function',
    '../common/scv_common_ext_performent.js',

    '../cons/scv_cons_record.js',
    '../cons/scv_cons_search.js',
    '../cons/scv_cons_format.js',
    '../cons/scv_cons_role.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_print_rpo_th_01.js',
], (
        record, url, search, query, file, runtime,
        alasql,
        libPdf,
        lbf,
        commonExtPerformance,

        constRecord,
        constSearch,
        constFormat,
        constRole,
        constSubsidiary,
        constSearchPrintRPOTH01,
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknTh.ID) return false;

            let arrLine01 = constSearchPrintRPOTH01.getDataSource({
                internalid: curRec.id
            });
            if(arrLine01.length == 0) return false;

            return true;
        }

        const addBtnPrint = (scriptContext, curRec) => {
            if(!validatePrint(curRec)) return null;

            let form = scriptContext.form;
            
            let urlScript = url.resolveScript({
                scriptId: 'customscript_scv_sl_print',
                deploymentId: 'customdeploy_scv_sl_print',
                params: {
                    recordId: curRec.id,
                    recordType: curRec.type,
                    printFile: "scv_print_rpo_th",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_rpo_th_pdf",
                label: "RPO (TH)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_rpo_th");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_rpo_th");

            return filePDF;
        };

        const rennderPDF = (curRec) =>{
            const renderer = libPdf.renderTemplateWithXml("scv_print_rpo_th");
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});
            renderer.addRecord('subsidiary', subsidiaryRec);
            const arrResDatas = [];
            const lkStores = { vendors: [] };

            let arrLine01 = constSearchPrintRPOTH01.getDataSource({ internalid: curRec.id });
            let objLineFirst = arrLine01[0] ?? {};
            // log.error("hoan arrLine01", arrLine01);

            const showBooleanDisplay = (checked) => checked ? "Yes" : "No";
            let projectId = curRec.getValue('cseg_scv_sg_proj');
            // let objLookup = search.lookupFields({
            //     type: 'customrecord_cseg_scv_sg_proj',
            //     id: projectId,
            //     columns: ['custrecord_scv_project_source.entityid' , 'custrecord_scv_project_source.companyname' ]
            // });
            
            let objLookup = {};
            if(projectId) {
                objLookup = search.lookupFields({
                    type: 'customrecord_cseg_scv_sg_proj',
                    id: projectId,
                    columns: [
                        'custrecord_scv_project_source.entityid',
                        'custrecord_scv_project_source.companyname'
                    ]
                });
            }
            const objResHeaders = {
                pjName: objLookup['custrecord_scv_project_source.companyname'] || '',
                poNumber: objLineFirst._1_po_no || '',
                scopeOfWork: objLineFirst._3_scope_of_work || '',
                typeOfContract: objLineFirst._10_type_of_contract || '',
                termsOfPayment: objLineFirst._5_terms || '',
                downPayment: objLineFirst._24_for_down_payment || '',
                monthlyProgress: objLineFirst._25_for_monthly_progress || '',
                installmentPayment: objLineFirst._26_installament_payment_as_per_condition_of_quotation || '',
                forDelivery: objLineFirst._27_for_delivery || '',
                retention: objLineFirst._6_retention || '',

                requestDate: objLineFirst._7_date_of_request || '',
                commenceDate: objLineFirst._6_commence_date || '',
                completionDate: objLineFirst._7_completion_date || '',
                ldPenaltyForDelay: objLineFirst._10_l_d_penalty_for_delay || '',
                maintenancePeriodDays: formatNumberByKey(objLineFirst._28_maintenance_period_days) || '',
                maintenancePeriodMonths: objLineFirst._29_maintenance_period_months || '',
                performanceBond: objLineFirst._11_performance_bond || '',
                insurance: objLineFirst._8_insurance || '',
                warranty: objLineFirst._13_warranty || '',
                vendorQtyRefNo: objLineFirst._14_vendor_q_ty_ref_no || '',
                remark: objLineFirst._18_remark || '',

                conditionsOfVendor: showBooleanDisplay(objLineFirst._19_conditions_of_vendor), 
                conditionsOfPurchase: showBooleanDisplay(objLineFirst._20_conditions_of_purchase),
                specification: showBooleanDisplay(objLineFirst._21_specification),
                bqScheduleOfRates: showBooleanDisplay(objLineFirst._22_b_q_schedule_of_rates),
                drawing: showBooleanDisplay(objLineFirst._23_drawing)
            };
            let arrLineItem = constRecord.getDataOfSublist(curRec, "item", ["lineuniquekey", "povendor"]);
            let arrLineVendor = alasql(`SELECT DISTINCT povendor, povendor_display FROM ?`, [arrLineItem]);

            for(let idxVendor = 0; idxVendor < arrLineVendor.length; idxVendor++){
                let objLineVendor = arrLineVendor[idxVendor];
                if(!objLineVendor.povendor) continue;

                let vendorName = constSearch.getDataLookupFieldsStore(lkStores.vendors, 'vendor', objLineVendor.povendor, ['companyname']).companyname;
                let vendorId = constSearch.getDataLookupFieldsStore(lkStores.vendors, 'vendor', objLineVendor.povendor, ['entityid']).entityid;
                let objResult = {
                    vendor: vendorName,
                    vendorNo: vendorId,
                    contactAmount: 0,
                    totalWorkingBudget: 0,
                    totalAccumulateAmount: 0,
                    totalAccumulateSiteExpense: 0,
                    totalBalance123: 0,
                    totalApplicableBudget: 0,
                    totalContractAmount: 0,
                    totalBalance56: 0,
                    lines: []
                };

                let lineUniqueKeys = [];

                for(let i = 0; i < arrLineItem.length; i++){
                    let objLineItem = arrLineItem[i];
                    if(objLineItem.povendor === objLineVendor.povendor) lineUniqueKeys.push(objLineItem.lineuniquekey);
                }

                let arrLine01_detail = arrLine01.filter(e => lineUniqueKeys.includes(e._0_po_line));

                for(let i = 0; i < arrLine01_detail.length; i++){
                    let objLine01 = arrLine01_detail[i];

                    let workingBudget = objLine01._16_working_budget * 1 || 0;
                    let accumulateAmount = objLine01._17_accumulate_amount * 1 || 0;
                    let accumulateSiteExpense = objLine01._30_accumulate_site_expense * 1 || 0;
                    let applicableBudget = objLine01._31_applicable_budget * 1 || 0;
                    let contractAmount = objLine01._4_contract_amount * 1 || 0;

                    let balance123 = workingBudget - accumulateAmount - accumulateSiteExpense;
                    let balance56 = applicableBudget - contractAmount;

                    objResult.contactAmount += contractAmount;

                    objResult.totalWorkingBudget += workingBudget;
                    objResult.totalAccumulateAmount += accumulateAmount;
                    objResult.totalAccumulateSiteExpense += accumulateSiteExpense;
                    objResult.totalBalance123 += balance123;
                    objResult.totalApplicableBudget += applicableBudget;
                    objResult.totalContractAmount += contractAmount;
                    objResult.totalBalance56 += balance56;

                    let objResDetail = {
                        workItemNo: objLine01._15_work_item_no,
                        workingBudget: formatNumberByKey(workingBudget),
                        accumulateAmount: formatNumberByKey(accumulateAmount),
                        accumulateSiteExpense: formatNumberByKey(accumulateSiteExpense),
                        balance123: formatNumberByKey(balance123),
                        applicableBudget: formatNumberByKey(applicableBudget),
                        contractAmount: formatNumberByKey(contractAmount),
                        balance56: formatNumberByKey(balance56)
                    };

                    objResult.lines.push(objResDetail);
                }

                objResult.contactAmount = formatNumberByKey(objResult.contactAmount);
                objResult.totalWorkingBudget = formatNumberByKey(objResult.totalWorkingBudget);
                objResult.totalAccumulateAmount = formatNumberByKey(objResult.totalAccumulateAmount);
                objResult.totalAccumulateSiteExpense = formatNumberByKey(objResult.totalAccumulateSiteExpense);
                objResult.totalBalance123 = formatNumberByKey(objResult.totalBalance123);
                objResult.totalApplicableBudget = formatNumberByKey(objResult.totalApplicableBudget);
                objResult.totalContractAmount = formatNumberByKey(objResult.totalContractAmount);
                objResult.totalBalance56 = formatNumberByKey(objResult.totalBalance56);

                arrResDatas.push(objResult);
            }
            objResHeaders.tagImgLogo = libPdf.createImageBySubsidiaryV2(subsidiaryRec, 140);

            renderer.addCustomDataSource({
                format: "OBJECT",
                alias: 'results',
                data: {
                    header: objResHeaders,
                    datas: arrResDatas
                }
            });

            return renderer;
        }
        
        const formatNumberByKey = (_number) =>{
            return  constFormat.formatNumber(_number, 2, {
                groupSeparator: ',',
                decimalSeparator: '.',
            });
        }

        return { addBtnPrint, generateFilePDF };
    });
