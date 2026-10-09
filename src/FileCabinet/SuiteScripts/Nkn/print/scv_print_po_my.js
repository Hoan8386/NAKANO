/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  06 Otc 2026         Thanh Hoan              Init, create file, PO (MY), from mr.Quân(https://app.clickup.com/t/3773072/86d3w9emj)
 */
define([
    "N/record", "N/url", 'N/runtime', 'N/search',
    "../lib/scv_lib_pdf.js",
    '../common/scv_common_ext_performent.js',

    '../cons/scv_cons_format.js',
    '../cons/scv_cons_record.js',
    '../cons/scv_cons_role.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_print_po_my_01.js',
], (
        record, url, runtime,search,
        libPdf,
        commonExtPerformance,

        constFormat,
        constRecord,
        constRole,
        constSubsidiary,
        constSearchPrintPOMY01,
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknMy.ID) return false;

            let arrLine01 = constSearchPrintPOMY01.getDataSource({
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
                    printFile: "scv_print_po_my",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_po_id_pdf",
                label: "PO (MY)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_po_my");
            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_po_my");

            return filePDF;
        };

        const rennderPDF = (curRec) =>{
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});

            const renderer = libPdf.renderTemplateWithXml("scv_print_po_my");

            renderer.addRecord('subsidiary', subsidiaryRec);

            let arrLine01 = constSearchPrintPOMY01.getDataSource({
                internalid: curRec.id
            });

            let objResult = {};
            let objLineFirst = arrLine01[0] ?? {};
            let projectId = curRec.getValue('cseg_scv_sg_proj');
            let objLookup = search.lookupFields({
                type: 'customrecord_cseg_scv_sg_proj',
                id: projectId,
                columns: [
                    'custrecord_scv_project_source.entityid',
                    'custrecord_scv_project_source.companyname'
                ]
            });

            let contractPrice = 0;

            for (let i = 0; i < arrLine01.length; i++) {
                contractPrice += arrLine01[i]._7_contract_price * 1 || 0;
            }

            let lines = arrLine01.map(line => {
                let currencyAmount = buildCurrencyAmount(
                    line._15_currency_display,
                    line._7_contract_price
                );

                return {
                    workItemCodeName:line._19_work_item_code_s_name,
                    workItemCode: line._20_work_item_code || "",
                    currency: currencyAmount.currency,
                    amount: currencyAmount.amount
                };
            });

            let contactPriceDisplay =
                contractPrice === 0 &&
                arrLine01.every(e =>
                    e._7_contract_price === "" ||
                    e._7_contract_price === null ||
                    e._7_contract_price === undefined
                )
                    ? { currency: '', amount: '' }
                    : buildCurrencyAmount(
                        objLineFirst._15_currency_display,
                        contractPrice
                    );
            objResult = {
                project: (objLookup['custrecord_scv_project_source.companyname'] || '').split(':').slice(1).join(':').trim(),
                projectId: (objLookup['custrecord_scv_project_source.entityid'] || ''),
                vendorName: objLineFirst._1_vendor_s_name || "",
                vendorAddress: objLineFirst._2_vendor_s_address || "",
                attention: objLineFirst._3_attention || "",
                vendorPhone: objLineFirst._4_vendor_s_phone || "",
                vendorFax: objLineFirst._5_vendor_s_fax || "",
                vendorEmail: objLineFirst._6_vendor_s_email || "",
                amount: objLineFirst._7_contract_price || "",
                date: objLineFirst._8_date || "",
                poNumber: objLineFirst._9_p_o_no || "",
                ourRef: objLineFirst._10_our_ref || "",
                yourRef: objLineFirst._11_your_ref || "",
                commencementDate: objLineFirst._12_commencement_date || "",
                completionDate: objLineFirst._13_completion_date || "",
                typeOfContract: objLineFirst._14_type_of_contract_display || objLineFirst._14_type_of_contract || "",
                currency: objLineFirst._15_currency_display || "",
                placeOfDelivery: objLineFirst._16_place_of_delivery || "",
                termsOfPayment:objLineFirst._17_terms_of_payment,
                remark: objLineFirst._18_remark || "",
                workItemCode: objLineFirst._20_work_item_code || "",
                contactPriceDisplay:contactPriceDisplay,
                lines:lines
            };    
                 
            libPdf.formatDataXMLWithObject(objResult);

            objResult.tagImgLogo =  libPdf.createImageBySubsidiaryV2(subsidiaryRec, 120);

            renderer.addCustomDataSource({
                format: "OBJECT",
                alias: 'result',
                data: objResult
            })

            return renderer;
        }
        
        const formatNumberByKey = (_number) =>{
            return constFormat.formatNumber(_number, 2, {
                groupSeparator: ',',
                decimalSeparator: '.',
            });
        }

        const buildCurrencyAmount = (currency, amount) => {
            if (!amount && amount !== 0) {
                return { currency: '', amount: '' };
            }

            let formatted = formatNumberByKey(amount);

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
