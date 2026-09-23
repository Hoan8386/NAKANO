/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Thanh Hoan              Init, create file, RPO (ID), from mr.Quân(https://app.clickup.com/t/3773072/86d3w9a1h)
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
    '../cons/scv_cons_search_print_rpo_id_01.js',
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
        constSearchPrintRPOID01,
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknId.ID) return false;

            let arrLine01 = constSearchPrintRPOID01.getDataSource({
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
                    printFile: "scv_print_rpo_id",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_rpo_id_pdf",
                label: "RPO (ID)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_rpo_id");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_rpo_id");

            return filePDF;
        };

        const rennderPDF = (curRec) =>{
            const renderer = libPdf.renderTemplateWithXml("scv_print_rpo_id");
            const arrResDatas = [];
            const lkStores = { vendors: [] };

            let arrLine01 = constSearchPrintRPOID01.getDataSource({ internalid: curRec.id });
            let objLineFirst = arrLine01[0] ?? {};
            //  log.error("hoan arrLine01", arrLine01);

            const showBooleanDisplay = (checked) => checked ? "Yes" : "No";
            let projectId = curRec.getValue('cseg_scv_sg_proj');
            let objLookup = {};

            if (projectId) {
                objLookup = search.lookupFields({
                    type: 'customrecord_cseg_scv_sg_proj',
                    id: projectId,
                    columns: ['custrecord_scv_project_source.entityid', 'custrecord_scv_project_source.companyname']
                }) || {};
            }
            const objResHeaders = {
                pjName: (objLookup['custrecord_scv_project_source.companyname'] || '').split(':').slice(1).join(':').trim(),
                poNumber: objLineFirst._1_po_no || '',
                scopeOfWork: objLineFirst._3_scope_of_work || '',
                termsOfPayment: objLineFirst._4_terms_of_payment || '',
                requestDate: objLineFirst._5_request_date || '',
                commenceDate: objLineFirst._6_commence_date || '',
                completionDate: objLineFirst._7_completion_date || '',
                insurance: objLineFirst._8_insurance || '',
                maintenancePeriod: objLineFirst._9_maintenance_period || '',
                typeOfContract: objLineFirst._10_type_of_contract || '',
                repeatOrder: showBooleanDisplay(objLineFirst._11_repeat_order) ,
                sbujkCertificate: showBooleanDisplay(objLineFirst._12_sbujk_certificate) ,
                retention: objLineFirst._13_retention || '',
                conditionsOfContract: showBooleanDisplay(objLineFirst._14_conditions_of_contract) ,
            };

            let arrLineItem = constRecord.getDataOfSublist(curRec, "item", ["lineuniquekey", "povendor"]);
            let arrLineVendor = alasql(`SELECT DISTINCT povendor, povendor_display FROM ?`, [arrLineItem]);

            for(let idxVendor = 0; idxVendor < arrLineVendor.length; idxVendor++){
                let objLineVendor = arrLineVendor[idxVendor];
                if(!objLineVendor.povendor) continue;

                let vendorName = constSearch.getDataLookupFieldsStore(lkStores.vendors, 'vendor', objLineVendor.povendor, ['companyname']).companyname;
                let vendorId = constSearch.getDataLookupFieldsStore(lkStores.vendors, 'vendor', objLineVendor.povendor, ['entityid']).entityid;
                let vendorST = constSearch.getDataLookupFieldsStore(lkStores.vendors, 'vendor', objLineVendor.povendor, ['custentity_scv_vendor_status']).custentity_scv_vendor_status;
                let vendorTax = constSearch.getDataLookupFieldsStore(lkStores.vendors, 'vendor', objLineVendor.povendor, ['custentity_scv_tax_number']).custentity_scv_tax_number;

                let objResult = {
                    vendor: vendorName,
                    claimantNo: vendorId,
                    vendorST: vendorST[0]?.text,
                    vendorTax: vendorTax,
                    rb: 0,
                    vat: 0,
                    nettoWorkingBudget: 0,
                    contractSum: 0,
                    contractCost: 0,
                    expected: 0,
                    balance: 0,
                    vatNettoWorkingBudget: 0,
                    vatContractSum: 0,
                    vatContractCost: 0,
                    vatExpected: 0,
                    vatBalance: 0,
                    grandTotalNettoWorkingBudget: 0,
                    grandTotalContractSum: 0,
                    grandTotalContractCost: 0,
                    grandTotalExpected: 0,
                    grandTotalBalance: 0,
                    lines: []
                };

                let lineUniqueKeys = [];
                for(let i = 0; i < arrLineItem.length; i++){
                    let objLineItem = arrLineItem[i];
                    if(objLineItem.povendor === objLineVendor.povendor) lineUniqueKeys.push(objLineItem.lineuniquekey);
                }

                let arrLine01_detail = [];
                for(let i = 0; i < arrLine01.length; i++){
                    let objLine01 = arrLine01[i];
                    if(lineUniqueKeys.indexOf(objLine01._0_po_line) !== -1) arrLine01_detail.push(objLine01);
                }

                let totalVat = 0;

                for(let i = 0; i < arrLine01_detail.length; i++){
                    let objLine01 = arrLine01_detail[i];

                    totalVat += objLine01._23_vat * 1 || 0 ;

                    let objResDetail = {
                        rb: objLine01._2_rp * 1,
                        vat: objLine01._20_vat * 1,
                        workItemNo: objLine01._15_work_item_no,
                        description: objLine01._16_desciption,
                        nettoWorkingBudget: objLine01._17_working_budget * 1,
                        contractSum: objLine01._21_contract_sum * 1,
                        contractCost: objLine01._18_contract_cost * 1,
                        expected: objLine01._22_expected * 1,
                        balance: objLine01._19_balance * 1
                    };

                    objResult.rb += objResDetail.rb;
                    objResult.vat += objResDetail.vat;
                    objResult.nettoWorkingBudget += objResDetail.nettoWorkingBudget;
                    objResult.contractSum += objResDetail.contractSum;
                    objResult.contractCost += objResDetail.contractCost;
                    objResult.expected += objResDetail.expected;
                    objResult.balance += objResDetail.balance;

                    objResDetail.rb = formatNumberByKey(objResDetail.rb);
                    objResDetail.vat = formatNumberByKey(objResDetail.vat);
                    objResDetail.nettoWorkingBudget = formatNumberByKey(objResDetail.nettoWorkingBudget);
                    objResDetail.contractSum = formatNumberByKey(objResDetail.contractSum);
                    objResDetail.contractCost = formatNumberByKey(objResDetail.contractCost);
                    objResDetail.expected = formatNumberByKey(objResDetail.expected);
                    objResDetail.balance = formatNumberByKey(objResDetail.balance);

                    objResult.lines.push(objResDetail);
                }

                objResult.vatNettoWorkingBudget = objResult.nettoWorkingBudget * totalVat;
                objResult.vatContractSum = objResult.contractSum * totalVat;
                objResult.vatContractCost = objResult.contractCost * totalVat;
                objResult.vatExpected = objResult.expected * totalVat;
                objResult.vatBalance = objResult.balance * totalVat;

                objResult.grandTotalNettoWorkingBudget = objResult.nettoWorkingBudget + objResult.vatNettoWorkingBudget;
                objResult.grandTotalContractSum = objResult.contractSum + objResult.vatContractSum;
                objResult.grandTotalContractCost = objResult.contractCost + objResult.vatContractCost;
                objResult.grandTotalExpected = objResult.expected + objResult.vatExpected;
                objResult.grandTotalBalance = objResult.balance + objResult.vatBalance;

                objResult.rb = formatNumberByKey(objResult.rb);
                objResult.vat = formatNumberByKey(objResult.vat);
                objResult.nettoWorkingBudget = formatNumberByKey(objResult.nettoWorkingBudget);
                objResult.contractSum = formatNumberByKey(objResult.contractSum);
                objResult.contractCost = formatNumberByKey(objResult.contractCost);
                objResult.expected = formatNumberByKey(objResult.expected);
                objResult.balance = formatNumberByKey(objResult.balance);
                objResult.vatNettoWorkingBudget = formatNumberByKey(objResult.vatNettoWorkingBudget);
                objResult.vatContractSum = formatNumberByKey(objResult.vatContractSum);
                objResult.vatContractCost = formatNumberByKey(objResult.vatContractCost);
                objResult.vatExpected = formatNumberByKey(objResult.vatExpected);
                objResult.vatBalance = formatNumberByKey(objResult.vatBalance);
                objResult.grandTotalNettoWorkingBudget = formatNumberByKey(objResult.grandTotalNettoWorkingBudget);
                objResult.grandTotalContractSum = formatNumberByKey(objResult.grandTotalContractSum);
                objResult.grandTotalContractCost = formatNumberByKey(objResult.grandTotalContractCost);
                objResult.grandTotalExpected = formatNumberByKey(objResult.grandTotalExpected);
                objResult.grandTotalBalance = formatNumberByKey(objResult.grandTotalBalance);

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
            return  constFormat.formatNumber(_number, 2, {
                groupSeparator: ',',
                decimalSeparator: '.',
            });
        }

        return { addBtnPrint, generateFilePDF };
    });
