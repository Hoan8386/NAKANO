/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  09 Sep 2026         Thanh Hoan              Add button RPO (VN) trên màn hình Requisition  from mr. Quân (https://app.clickup.com/t/3773072/86d3w9a1h)
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
    '../cons/scv_cons_search_print_rpo_vn_01.js',
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
        constSearchPrintRPOVN01,
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            // log.error("hoan check" , curUser);
            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknVn.ID) return false;

            let arrLine01 = constSearchPrintRPOVN01.getDataSource({
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
                    printFile: "scv_print_rpo_vn",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_rpo_vn_pdf",
                label: "RPO (VN)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_rpo_vn");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_rpo_vn");

            return filePDF;
        };

        const rennderPDF = (curRec) =>{
            const renderer = libPdf.renderTemplateWithXml("scv_print_rpo_vn");
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});
            const arrResDatas = [];

            const lkStores = {
                vendors: []
            };

            let arrLine01 = constSearchPrintRPOVN01.getDataSource({
                internalid: curRec.id
            });
            
            let objLineFirst = arrLine01[0] ?? {};
            // log.error("Hoan",arrLine01)
            // arrLine01[0]._24_working_budget = null;
            // arrLine01[0]._26_accumulate_amount = "0";
            let projectId = curRec.getValue('cseg_scv_sg_proj');
            let objLookup = search.lookupFields({
                type: 'customrecord_cseg_scv_sg_proj',
                id: projectId,
                columns: ['custrecord_scv_project_source.entityid' , 'custrecord_scv_project_source.companyname' ]
            });

            let totalAmount = 0;
            arrLine01.forEach(item => {
                totalAmount += Number(item._25_this_amount) || 0;
            });
            const objResHeaders = {
                pjCode: objLookup['custrecord_scv_project_source.entityid'] || '',
                pjName: objLookup['custrecord_scv_project_source.companyname'] || '',
                vendor: objLookup.companyname || '',
                SCofWork:objLineFirst._1_scope_of_work,
                totalAmount:libPdf.formatNumber(totalAmount),
                currency:objLineFirst._2_currency,
                currencyDisplay:objLineFirst._2_currency_display,
                note:objLineFirst._3_note,
                typeOfCt:objLineFirst._4_type_of_contract_display || objLineFirst._4_type_of_contract,
                docNum:objLineFirst._5_document_number,
                datePO:objLineFirst._6_date_of_request_for_po,
                dateCommencement:objLineFirst._7_date_of_commencement,
                dateCompletion:objLineFirst._8_date_of_completion,
                mainPride:objLineFirst._9_maintenance_pride,
                warranty:objLineFirst._10_warranty,
                insurance:objLineFirst._11_insurance_display,
                quoNo:objLineFirst._12_quotation_no,
                quoDate:formatDateOrdinal(objLineFirst._13_quotation_date),
                poNo:objLineFirst._14_po_no,
                paymentTerm:objLineFirst._15_payment_term,
                subCon:        objLineFirst._16_sub_con_quotation + "",
                drawings:      objLineFirst._17_drawings + "",
                schedule:      objLineFirst._18_schedule + "",
                other:         objLineFirst._19_other + "",
                specification: objLineFirst._20_specification + "",
                retention:objLineFirst._21_retention_display || 'N/A',
                bankGuarantee: objLineFirst._22_bank_guarantee||'N/A',
                remark: objLineFirst._29_remark,
                reasonOfExcessFromWB: objLineFirst._30_reason_of_excess_from_w_b,
                compensationProposal: objLineFirst._31_compensation_proposal,
            };

            libPdf.formatDataXMLWithObject(objResHeaders);
            objResHeaders.tagImgLogo = libPdf.createImageBySubsidiaryV2(subsidiaryRec, 120);

            let arrLineItem = constRecord.getDataOfSublist(curRec, "item", [
                "lineuniquekey", "povendor",
            ]);

            let arrLineVendor = alasql(`SELECT DISTINCT povendor, povendor_display FROM ?`, [arrLineItem]);
            // log.error("check arrLineVendor " ,arrLineVendor)
            for (let idxVendor = 0; idxVendor < arrLineVendor.length; idxVendor++) {
                let objLineVendor = arrLineVendor[idxVendor];

                if (!objLineVendor.povendor) continue;

                let vendorName = constSearch.getDataLookupFieldsStore(lkStores.vendors, 'vendor', objLineVendor.povendor, [
                    'companyname'
                ]).companyname;

                let lineUniqueKeys = arrLineItem
                    .filter(e => e.povendor === objLineVendor.povendor)
                    .map(e => e.lineuniquekey);

                let arrLine01_detail = arrLine01.filter(e => lineUniqueKeys.includes(e._32_po_line));

                let objResult = {
                    vendor: vendorName,
                    totalWorkingBudget: null,
                    totalThisAmount: null,
                    totalAccumulateAmount: null,
                    totalBalance: null,
                    lines: []
                };

                for (let i = 0; i < arrLine01_detail.length; i++) {
                    let objLine01 = arrLine01_detail[i];
                    let currency = objLine01._2_currency_display || '';

                    let workingBudgetVal = null;
                    if (objLine01._24_working_budget) {
                        workingBudgetVal = Number(objLine01._24_working_budget);
                    }

                    let thisAmountVal = null;
                    if (objLine01._25_this_amount) {
                        thisAmountVal = Number(objLine01._25_this_amount);
                    }

                    let accumulateAmtVal = null;
                    if (objLine01._26_accumulate_amount) {
                        accumulateAmtVal = Number(objLine01._26_accumulate_amount);
                    }

                    let balanceVal = null;
                    if (objLine01._27_balance) {
                        balanceVal = Number(objLine01._27_balance);
                    }

                    objResult.totalWorkingBudget += workingBudgetVal;

                    objResult.totalThisAmount += thisAmountVal;

                    objResult.totalAccumulateAmount += accumulateAmtVal;

                    objResult.totalBalance += balanceVal;

                    let objResDetail = {
                        wbNo:             objLine01._23_w_b_no,
                        currency:         currency,
                        workingBudget:    buildCurrencyAmount(currency, workingBudgetVal),
                        thisAmount:       buildCurrencyAmount(currency, thisAmountVal),
                        accumulateAmount: buildCurrencyAmount(currency, accumulateAmtVal),
                        balance:          buildCurrencyAmount(currency, balanceVal),
                        remarks:          objLine01._28_remark_memo_line,
                    };

                    objResult.lines.push(objResDetail);
                }

                // Totals row — use currency from first line (all lines share same currency)
                let totalCurrency = (arrLine01_detail[0] || {})._2_currency_display || '';
                objResult.totalWorkingBudgetDisplay =
                    objResult.totalWorkingBudget === 0 &&
                    arrLine01_detail.every(e =>
                        e._24_working_budget === "" ||
                        e._24_working_budget === null ||
                        e._24_working_budget === undefined
                    )
                        ? { currency: '', amount: '' }
                        : buildCurrencyAmount(totalCurrency, objResult.totalWorkingBudget);

                objResult.totalThisAmountDisplay =
                    objResult.totalThisAmount === 0 &&
                    arrLine01_detail.every(e =>
                        e._25_this_amount === "" ||
                        e._25_this_amount === null ||
                        e._25_this_amount === undefined
                    )
                        ? { currency: '', amount: '' }
                        : buildCurrencyAmount(totalCurrency, objResult.totalThisAmount);

                objResult.totalAccumulateAmountDisplay =
                    objResult.totalAccumulateAmount === 0 &&
                    arrLine01_detail.every(e =>
                        e._26_accumulate_amount === "" ||
                        e._26_accumulate_amount === null ||
                        e._26_accumulate_amount === undefined
                    )
                        ? { currency: '', amount: '' }
                        : buildCurrencyAmount(totalCurrency, objResult.totalAccumulateAmount);

                objResult.totalBalanceDisplay =
                    objResult.totalBalance === 0 &&
                    arrLine01_detail.every(e =>
                        e._27_balance === "" ||
                        e._27_balance === null ||
                        e._27_balance === undefined
                    )
                        ? { currency: '', amount: '' }
                        : buildCurrencyAmount(totalCurrency, objResult.totalBalance);

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

        const formatDateOrdinal = (date) => {
            if (!date) return '';

            const d = new Date(date);
            const day = d.getDate();

            let suffix = 'th';

            if (day % 100 < 11 || day % 100 > 13) {
                if (day % 10 === 1) suffix = 'st';
                else if (day % 10 === 2) suffix = 'nd';
                else if (day % 10 === 3) suffix = 'rd';
            }

            return `${d.toLocaleString('en-US', { month: 'short' })} ${day}${suffix}, ${d.getFullYear()}`;
        };

        return { addBtnPrint, generateFilePDF };
    });
