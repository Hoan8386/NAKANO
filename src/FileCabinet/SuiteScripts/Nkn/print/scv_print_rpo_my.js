/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  06 Otc 2026         Thanh Hoan              Init, create file, RPO (MY), from mr.Quân(https://app.clickup.com/t/3773072/86d3w9a1h)
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
    '../cons/scv_cons_search_print_rpo_my_01.js',
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
        constSearchPrintRPOMY01,
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknMy.ID) return false;

            let arrLine01 = constSearchPrintRPOMY01.getDataSource({
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
                    printFile: "scv_print_rpo_my",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_rpo_my_pdf",
                label: "RPO (MY)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_rpo_my");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_rpo_my");

            return filePDF;
        };

        const rennderPDF = (curRec) =>{
            const renderer = libPdf.renderTemplateWithXml("scv_print_rpo_my");
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});
            renderer.addRecord('subsidiary', subsidiaryRec);
            const arrResDatas = [];
            const lkStores = { vendors: [] };

            let arrLine01 = constSearchPrintRPOMY01.getDataSource({ internalid: curRec.id });
            let objLineFirst = arrLine01[0] ?? {};
            // log.error("hoan arrLine01", arrLine01);

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
                pjId: (objLookup['custrecord_scv_project_source.entityid'] || ''),
                attention: objLineFirst._1_attention || '',
                scopeOfWork: objLineFirst._2_scope_of_work || '',
                currency: objLineFirst._3_currency_display || '',
                // contractPrice: objLineFirst._4_contract_price || '',
                typeOfContract: objLineFirst._5_type_of_contract || '',
                terms: objLineFirst._6_terms || '',
                retention: objLineFirst._7_retention || '',
                cidbRegistration: showBooleanDisplay(objLineFirst._8_cidb_registration) || '',
                grade: objLineFirst._9_grade || '',
                vendorQuotRef: objLineFirst._10_vendor_quot_ref || '',
                poNo: objLineFirst._11_po_no || '',
                dateOfRequest: objLineFirst._12_date_of_request || '',
                dateOfCommencement: objLineFirst._13_date_of_commencement || '',
                dateOfCompletion: objLineFirst._14_date_of_completion || '',
                performanceBond: objLineFirst._15_performance_bond || '',
                performanceBondFlag:  showBooleanDisplay( objLineFirst._29_performance_bond_flag) ,
                insurance: objLineFirst._16_insurance_display ||  objLineFirst._16_insurance || '',
                ldPenaltyForDelayFlag: showBooleanDisplay(objLineFirst._17_l_d_penalty_for_delay_flag) || '',
                ldPenaltyForDelay: objLineFirst._18_l_d_penalty_for_delay || '',    
                defectLiabilityPeriod: objLineFirst._19_deffect_liability_period || '',
                warranty: objLineFirst._20_warranty_display || objLineFirst._20_warranty || '',
                warrantyValue: objLineFirst._30_warranty_value_display || objLineFirst._30_warranty_value || '',
                conditionsOfConsultant: showBooleanDisplay(objLineFirst._21_conditions_of_consultant),
                conditionsOfSubContract: showBooleanDisplay(objLineFirst._22_conditions_of_sub_contract),
                specification: showBooleanDisplay(objLineFirst._23_specification),
                bqScheduleOfRates: showBooleanDisplay(objLineFirst._24_b_q_schedule_of_rates),
                drawingsProvidedToNkn: showBooleanDisplay(objLineFirst._25_drawings_provided_to_nkn),
                remarks: objLineFirst._28_remark || '',
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
                    claimantNo: vendorId,
                    totalEstimate: 0,
                    totalContractPrice: null,
                    contractPrice: 0,
                    totalBalance: 0,
                    lines: []
                };

                let lineUniqueKeys = [];
                for(let i = 0; i < arrLineItem.length; i++){
                    let objLineItem = arrLineItem[i];
                    if(objLineItem.povendor === objLineVendor.povendor) {
                        lineUniqueKeys.push(objLineItem.lineuniquekey);
                    }
                }

                let arrLine01_detail = arrLine01.filter(e =>
                    lineUniqueKeys.includes(e._0_po_line)
                );

                let arrLine01_group = alasql(`
                    SELECT
                        _26_work_item_no,
                        SUM(CAST(_27_working_budget AS NUMBER)) AS totalEstimate,
                        SUM(CAST(_4_contract_price AS NUMBER)) AS totalContractPrice
                    FROM ?
                    GROUP BY _26_work_item_no
                `, [arrLine01_detail]);

                for (let i = 0; i < arrLine01_group.length; i++) {
                    let item = arrLine01_group[i];
                    let arrRemarks = [];

                    for (let j = 0; j < arrLine01_detail.length; j++) {
                        let detail = arrLine01_detail[j];

                        if (detail._26_work_item_no === item._26_work_item_no) {
                            if (detail._31_remark_line) {
                                arrRemarks.push(detail._31_remark_line);
                            }
                        }
                    }

                    item.remarks = arrRemarks;
                }

                for (let i = 0; i < arrLine01_group.length; i++) {
                    let item = arrLine01_group[i];

                    let estimate = Number(item.totalEstimate) || 0;
                    let contractPrice = Number(item.totalContractPrice) || 0;
                    let balance = estimate - contractPrice;

                    const objResDetail = {
                        workItemNo: libPdf.formatDataXML(item._26_work_item_no) || '',
                        estimate: formatNumberByKey(estimate),
                        contractPrice: formatNumberByKey(contractPrice),
                        balance: formatNumberByKey(balance),
                        remarks: (item.remarks || [])
                        .filter(e => e)
                        .join('; ')
                    };

                    objResult.totalEstimate += estimate;
                    objResult.totalContractPrice += contractPrice;
                    objResult.totalBalance += balance;

                    objResult.lines.push(objResDetail);
                }

                let totalCurrency = (arrLine01_detail[0] || {})._3_currency_display || '';

                objResult.totalContractPriceDisplay =
                    objResult.totalContractPrice === 0 &&
                    arrLine01_detail.every(e =>
                        e._4_contract_price === "" ||
                        e._4_contract_price === null ||
                        e._4_contract_price === undefined
                    )
                        ? { currency: '', amount: '' }
                        : buildCurrencyAmount(
                            totalCurrency,
                            objResult.totalContractPrice
                        );

                objResult.totalEstimate = formatNumberByKey(objResult.totalEstimate);
                objResult.totalContractPrice = formatNumberByKey(objResult.totalContractPrice);
                objResult.totalBalance = formatNumberByKey(objResult.totalBalance);

                arrResDatas.push(objResult);
            }
           
            
            libPdf.formatDataXMLWithObject(objResHeaders);
            objResHeaders.tagImgLogo = libPdf.createImageBySubsidiaryV2(subsidiaryRec, 60);

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

        const buildCurrencyAmount = (currency, amount) => {
            if (!amount && amount !== 0) {
                return { currency: '', amount: '' };
            }

            let formatted = constFormat.formatNumber(amount, 2, {
                groupSeparator: ',',
                decimalSeparator: '.',
            });

            if (!formatted) {
                return { currency: '', amount: '' };
            }

            return {
                currency: currency || '',
                amount: formatted
            };
        }

        return { addBtnPrint, generateFilePDF };
    });
