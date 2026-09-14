/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  14 Sep 2026         THanh Hoan              Init, create file, P2P_RequestPayment_PrintForm, from mr.Quân (https://app.clickup.com/t/3773072/86d3w9cnt)
 */
define([
    "N/record", "N/url", 'N/runtime','N/search',
    "../lib/scv_lib_pdf.js",
    '../common/scv_common_ext_performent.js',

    '../cons/scv_cons_format.js',
    '../cons/scv_cons_record.js',
    '../cons/scv_cons_role.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_print_rop_vn_01.js',
    '../cons/scv_cons_search_print_rop_vn_02.js',
], (
        record, url, runtime,search,
        libPdf,
        commonExtPerformance,

        constFormat,
        constRecord,
        constRole,
        constSubsidiary,
        constSearchRopVn01,
        constSearchRopVn02,
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknVn.ID) return false;

            let arrVendbill = constSearchRopVn01.getDataSource({
                internalid: curRec.id
            });
            if(arrVendbill.length == 0) return false;

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
                    printFile: "scv_print_rop_vn",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_rop_vn_pdf",
                label: "ROP (VN)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_rop_vn");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_rop_vn");

            return filePDF;
        };

        const rennderPDF = (curRec) => {
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({ type: "subsidiary", id: subsidiaryId });
            const renderer = libPdf.renderTemplateWithXml("scv_print_rop_vn");
            renderer.addRecord('subsidiary', subsidiaryRec);

            let arrLine01 = constSearchRopVn01.getDataSource({ internalid: curRec.id });
            let arrLine02 = constSearchRopVn02.getDataSource();
            let objLineFirst = arrLine01[0];
            let objLookup = objLineFirst.objLookup || {};

            const buildCurrencyAmount = (currency, amount) => {
                if (amount === null || amount === undefined || amount === '') return { currency: '', amount: '' };
                let formatted = constFormat.formatNumber(amount, 0, { groupSeparator: ',', decimalSeparator: '.' });
                return { currency: currency || '', amount: formatted || '' };
            };

            const arrLine = [];
            let totalContractAmount = 0, totalPrevApprovedAmount = 0, totalThisApprovedAmount = 0, totalAccumulateAmount = 0, totalBalance = 0, totalRetention = 0, totalTaxAmount = 0;
            let hasContractAmount = false, hasPrevApprovedAmount = false, hasThisApprovedAmount = false, hasAccumulateAmount = false, hasBalance = false, hasRetention = false, hasTaxAmount = false;

            arrLine01.forEach(line01 => {
                const line02 = arrLine02.find(line02 => line02.po_internal_id === line01.po_internal_id && line02._3_ori_line_id === line01._26_ori_line_id);

                let contractAmount = null;
                if (line01._5_contract_amount) {
                    contractAmount = Number(line01._5_contract_amount);
                    totalContractAmount += contractAmount;
                    hasContractAmount = true;
                }

                let thisApprovedAmount = null;
                if (line01._6_this_approved_amount) {
                    thisApprovedAmount = Number(line01._6_this_approved_amount);
                    totalThisApprovedAmount += thisApprovedAmount;
                    hasThisApprovedAmount = true;
                }

                let prevApprovedAmount = null;
                if (line02?._2_prev_approval_incl_retention) {
                    prevApprovedAmount = Number(line02._2_prev_approval_incl_retention);
                    totalPrevApprovedAmount += prevApprovedAmount;
                    hasPrevApprovedAmount = true;
                }

                let accumulateAmount = null;
                if (prevApprovedAmount !== null || thisApprovedAmount !== null) {
                    accumulateAmount = (prevApprovedAmount || 0) + (thisApprovedAmount || 0);
                    totalAccumulateAmount += accumulateAmount;
                    hasAccumulateAmount = true;
                }

                let balance = null;
                if (contractAmount !== null || accumulateAmount !== null) {
                    balance = (contractAmount || 0) - (accumulateAmount || 0);
                    totalBalance += balance;
                    hasBalance = true;
                }

                let retentionAmount = null;
                if (contractAmount !== null && line01._17_retention_display) {
                    retentionAmount = contractAmount * (parseFloat(line01._17_retention_display) / 100);
                    totalRetention += retentionAmount;
                    hasRetention = true;
                }

                let taxAmount = null;
                if (line01._11_tax_amount) {
                    taxAmount = Number(line01._11_tax_amount);
                    totalTaxAmount += taxAmount;
                }

                arrLine.push({
                    wbNo: line01._4_w_b_no || '',
                    contractAmount: buildCurrencyAmount(line01._9_currency_display, contractAmount),
                    prevApprovedAmount: buildCurrencyAmount(line02?._5_currency_display || '', prevApprovedAmount),
                    thisApprovedAmount: buildCurrencyAmount(line01._9_currency_display, thisApprovedAmount),
                    accumulateAmount: buildCurrencyAmount(line01._9_currency_display, accumulateAmount),
                    percent: line01._10 || '',
                    balance: buildCurrencyAmount(line01._9_currency_display, balance),
                    retention: buildCurrencyAmount(line01._9_currency_display, retentionAmount),
                    retentionCash: line01._15_cash_or_a_c || false,
                    retentionBG: line01._16_b_g || false
                });
            });

            const totalCurrency = objLineFirst._9_currency_display || '';
            const totalInclVatContractAmount = totalContractAmount + totalTaxAmount;
            const totalInclVatThisApprovedAmount = totalThisApprovedAmount + totalTaxAmount;
            const totalInclVatAccumulateAmount = totalAccumulateAmount + totalTaxAmount;
            const totalInclVatBalance = totalBalance + totalTaxAmount;
            const totalPercent = totalAccumulateAmount ? (totalContractAmount / totalAccumulateAmount) * 100 : '';
            const totalInclVatPercent = totalInclVatAccumulateAmount ? (totalInclVatContractAmount / totalInclVatAccumulateAmount) * 100 : '';

            const objResult = {
                tagImgLogo: libPdf.createImageBySubsidiaryV2(subsidiaryRec, 120),
                docNumber: objLineFirst._1_document_number || '',
                pjName: objLookup['custrecord_scv_project_source.companyname'] || '',
                pjCode: objLookup['custrecord_scv_project_source.entityid'] || '',
                poNo: objLineFirst._2_p_o_no || '',
                vendor: objLineFirst._3_vendor || '',
                dateInvoiceReceived: objLineFirst._8_date || '',
                dueDate: objLineFirst._14_due_date || '',
                arrLine,
                totalContractAmount: hasContractAmount ? buildCurrencyAmount(totalCurrency, totalContractAmount) : { currency: '', amount: '' },
                totalPrevApprovedAmount: hasPrevApprovedAmount ? buildCurrencyAmount(totalCurrency, totalPrevApprovedAmount) : { currency: '', amount: '' },
                totalThisApprovedAmount: hasThisApprovedAmount ? buildCurrencyAmount(totalCurrency, totalThisApprovedAmount) : { currency: '', amount: '' },
                totalAccumulateAmount: hasAccumulateAmount ? buildCurrencyAmount(totalCurrency, totalAccumulateAmount) : { currency: '', amount: '' },
                totalPercent,
                totalBalance: hasBalance ? buildCurrencyAmount(totalCurrency, totalBalance) : { currency: '', amount: '' },
                totalRetention: hasRetention ? buildCurrencyAmount(totalCurrency, totalRetention) : { currency: '', amount: '' },
                totalInclVatContractAmount: hasContractAmount || hasTaxAmount ? buildCurrencyAmount(totalCurrency, totalInclVatContractAmount) : { currency: '', amount: '' },
                totalInclVatPrevApprovedAmount: { currency: '', amount: '' },
                totalInclVatThisApprovedAmount: hasThisApprovedAmount || hasTaxAmount ? buildCurrencyAmount(totalCurrency, totalInclVatThisApprovedAmount) : { currency: '', amount: '' },
                totalInclVatAccumulateAmount: hasAccumulateAmount || hasTaxAmount ? buildCurrencyAmount(totalCurrency, totalInclVatAccumulateAmount) : { currency: '', amount: '' },
                totalInclVatPercent,
                totalInclVatBalance: hasBalance || hasTaxAmount ? buildCurrencyAmount(totalCurrency, totalInclVatBalance) : { currency: '', amount: '' },
                totalTaxAmount: hasTaxAmount ? buildCurrencyAmount(totalCurrency, totalTaxAmount) : { currency: '', amount: '' },
                other: objLineFirst._12_other || false,
                remark: objLineFirst._13_remark || '',
                taxAmount: objLineFirst._11_tax_amount || '',
                subConPaymentRequest: objLineFirst._18_sub_con_payment_request || false,
                handoverInspectionSheet: objLineFirst._19_handover_or_inspection_sheet || false,
                redInvoice: objLineFirst._20_red_invoice || false,
                previousRopPo: objLineFirst._21_previous_rop_po || false,
                bankGuarantee: objLineFirst._22_bank_guarantee || false,
                liquidationContract: objLineFirst._23_liquidation_contract || false,
                bankRemittance: objLineFirst._24_bank_remittance || false,
                summaryDescriptionOfPayment: objLineFirst._25_summary_description_of_payment || '',
                reasonOfExcessFromPO: objLineFirst._26_reason_of_excess_from_po_if_any || ''
            };

            renderer.addCustomDataSource({ format: "OBJECT", alias: 'results', data: objResult });
            return renderer;
        };
        const buildCurrencyAmount = (currency, amount) => {
            if (amount === null || amount === undefined || amount === '') {
                return {
                    currency: '',
                    amount: ''
                };
            }

            const formatted = constFormat.formatNumber(amount, 0, {
                groupSeparator: ',',
                decimalSeparator: '.',
            });

            return {
                currency: currency || '',
                amount: formatted || ''
            };
        };

        return { addBtnPrint, generateFilePDF };
    });
