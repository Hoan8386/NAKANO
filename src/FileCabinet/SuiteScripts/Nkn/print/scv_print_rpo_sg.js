/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  24 Aug 2026         Huy Pham                Init, create file, RPO SG, from mr.Quân(https://app.clickup.com/t/3773072/86d3w9a1h)
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
    '../cons/scv_cons_search_print_rpo_sg_01.js',
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
        constSearchPrintRPOSG01,
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknSg.ID) return false;

            let arrLine01 = constSearchPrintRPOSG01.getDataSource({
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
                    printFile: "scv_print_rpo_sg",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_rpo_sg_pdf",
                label: "RPO (SG)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_rpo_sg");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_rpo_sg");

            return filePDF;
        };

        const rennderPDF = (curRec) =>{
            const renderer = libPdf.renderTemplateWithXml("scv_print_rpo_sg");

            const arrResDatas = [];

            const lkStores = {
                vendors: []
            };

            let arrLine01 = constSearchPrintRPOSG01.getDataSource({
                internalid: curRec.id
            });
            
            let objLineFirst = arrLine01[0] ?? {};

            const showBooleanDisplay = (checked) => checked ? "Yes" : "No";

            const objResHeaders = {
                isoNumber: objLineFirst._25_iso_number,
                subsidiary: objLineFirst._1_subsidiary,
                project: objLineFirst._2_projects_display,
                poNo: objLineFirst._3_p_o_no,
                // claimantNo: objLineFirst._4_claimant_no,
                scopeOfWork: objLineFirst._5_scope_of_work,
                gst: objLineFirst._7_gst,
                typeOfContract: objLineFirst._8_type_of_contract_display,
                paymentTerm: objLineFirst._9_terms_display,
                retention: objLineFirst._10_retention_display,
                dateOfRequest: objLineFirst._12_date_of_request,
                dateOfCommencement: objLineFirst._13_date_of_commencement,
                dateOfCompletion: objLineFirst._14_date_of_completion,
                ldPenaltyForDelay: showBooleanDisplay(objLineFirst._15_l_d_penalty_for_delay_flag),
                ldPenaltyForDelayPerday: objLineFirst._32_l_d_penalty_for_delay,
                maintenacePeriod: objLineFirst._16_maintenance_period,
                performanceBond: showBooleanDisplay(objLineFirst._17_performance_bond_flag),
                performanceBondPercent: objLineFirst._33_performance_bond,
                insurance: objLineFirst._18_insurance_display,
                warranty: objLineFirst._19_warranty_display,
                conditionsOfSubcontract: showBooleanDisplay(objLineFirst._20_conditions_of_subcontract),
                conditionsOfPurchase: showBooleanDisplay(objLineFirst._21_conditions_of_purchase),
                specification: showBooleanDisplay(objLineFirst._22_specification),
                bqScheduleOfRates: showBooleanDisplay(objLineFirst._23_b_q_schedule_of_rates),
                drawings: showBooleanDisplay(objLineFirst._24_drawings),
                remark: objLineFirst._30_remark?.replaceAll("\n","<br />"),
            };

            let arrLineItem = constRecord.getDataOfSublist(curRec, "item", [
                "lineuniquekey", "povendor", 
            ]);
            
            let arrLineVendor = alasql(`SELECT DISTINCT povendor, povendor_display FROM ?`, [arrLineItem]);
            for(let idxVendor = 0; idxVendor < arrLineVendor.length; idxVendor++){
                let objLineVendor = arrLineVendor[idxVendor];

                if(!objLineVendor.povendor) continue;

                let vendorName = constSearch.getDataLookupFieldsStore(lkStores.vendors, 'vendor', objLineVendor.povendor, [
                    'companyname'
                ]).companyname;

                let vendorId = constSearch.getDataLookupFieldsStore(lkStores.vendors, 'vendor', objLineVendor.povendor, [
                    'entityid'
                ]).entityid;
                
                log.error("hoan check entity id" ,vendorId)
                let objResult = {
                    vendor: vendorName,
                    claimantNo:vendorId,
                    vendorQtnRef: {},

                    workingBudget: 0,
                    contractPrice: 0,
                    balance: 0,
                    reserves: 0,
                    lines: []
                };

                let lineUniqueKeys = arrLineItem.filter(e => e.povendor === objLineVendor.povendor).map(e => e.lineuniquekey);

                let arrLine01_detail = arrLine01.filter(e => lineUniqueKeys.includes(e._34_po_line));

                for(let i = 0; i < arrLine01_detail.length; i++){
                    let objLine01 = arrLine01_detail[i];

                    if(objLine01._11_vendor_qtn_ref){
                        objResult.vendorQtnRef[objLine01._11_vendor_qtn_ref] = objLine01._11_vendor_qtn_ref;
                    }

                    let objResDetail = {
                        workItemNo: objLine01._31_work_item_code,
                        workingBudget: objLine01._26_working_budget * 1,
                        contractPrice: objLine01._27_contract_price * 1,
                        balance: objLine01._28_balance * 1,
                        reserves: objLine01._29_reserves * 1,
                    }

                    objResult.workingBudget += objResDetail.workingBudget;
                    objResult.contractPrice += objResDetail.contractPrice;
                    objResult.balance += objResDetail.balance;
                    objResult.reserves += objResDetail.reserves;

                    objResDetail.workingBudget = formatNumberByKey(objResDetail.workingBudget);
                    objResDetail.contractPrice = formatNumberByKey(objResDetail.contractPrice);
                    objResDetail.balance = formatNumberByKey(objResDetail.balance);
                    objResDetail.reserves = formatNumberByKey(objResDetail.reserves);

                    objResult.lines.push(objResDetail)
                }

                objResult.vendorQtnRef = Object.values(objResult.vendorQtnRef).join(", ");

                objResult.workingBudget = formatNumberByKey(objResult.workingBudget);
                objResult.contractPrice = formatNumberByKey(objResult.contractPrice);
                objResult.balance = formatNumberByKey(objResult.balance);
                objResult.reserves = formatNumberByKey(objResult.reserves);

                arrResDatas.push(objResult);
            }

            renderer.addCustomDataSource({
                format: "OBJECT",
                alias: 'results',
                data: {
                    headers: objResHeaders,
                    datas: arrResDatas
                }
            });

            return renderer;
        }
        
        const formatNumberByKey = (_number) =>{
            return "$" + constFormat.formatNumber(_number, 2, {
                groupSeparator: ',',
                decimalSeparator: '.',
            });
        }

        return { addBtnPrint, generateFilePDF };
    });
