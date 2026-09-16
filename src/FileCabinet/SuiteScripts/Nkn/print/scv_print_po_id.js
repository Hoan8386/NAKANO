/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Thanh Hoan              Init, create file, PO (ID), from mr.Quân(https://app.clickup.com/t/3773072/86d3w9emj)
 */
define([
    "N/record", "N/url", 'N/runtime',
    "../lib/scv_lib_pdf.js",
    '../common/scv_common_ext_performent.js',

    '../cons/scv_cons_format.js',
    '../cons/scv_cons_record.js',
    '../cons/scv_cons_role.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_print_po_id_01.js',
], (
        record, url, runtime,
        libPdf,
        commonExtPerformance,

        constFormat,
        constRecord,
        constRole,
        constSubsidiary,
        constSearchPrintPOID01,
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknId.ID) return false;

            let arrLine01 = constSearchPrintPOID01.getDataSource({
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
                    printFile: "scv_print_po_id",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_po_id_pdf",
                label: "PO (ID)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_po_id");
            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_po_id");

            return filePDF;
        };

        const rennderPDF = (curRec) =>{
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});

            const renderer = libPdf.renderTemplateWithXml("scv_print_po_id");

            renderer.addRecord('subsidiary', subsidiaryRec);

            let arrLine01 = constSearchPrintPOID01.getDataSource({
                internalid: curRec.id
            });

            // log.error("hoan arrLine01" , arrLine01);
            let objResult = {};
            let objLineFirst = arrLine01[0] ?? {};

            let contractPrice = null;
            let vat = null;

            arrLine01.forEach(item => {
                let contract_price_item = null;
                if (item._12_contract_price) {
                        contract_price_item = item._12_contract_price * 1
                    }
                
                let vat_item = null;
                if (item._13_vat) {
                    vat_item = item._13_vat * 1;
                }
                contractPrice +=contract_price_item;
                vat +=vat_item;
            });
            objResult = {
                project: objLineFirst._1_projects_display || "",
                subCon: objLineFirst._2_sub_contractor_s_name || "",
                subConAddress: objLineFirst._3_sub_contractor_s_address || "",
                subConPhone: objLineFirst._4_sub_contractor_s_phone || "",
                attention: objLineFirst._5_attention_display || "",
                date: objLineFirst._6_date || "",
                poNumber: objLineFirst._7_p_o_no || "",
                yourRef: objLineFirst._8_your_ref || "",
                workItemCode: objLineFirst._9_work_item_code || "",
                scopeOfWork: objLineFirst._10_scope_of_work || "",
                currency: objLineFirst._11_currency_display || "",
                contractPrice:  contractPrice === 0 &&
                    arrLine01.every(e =>
                        e._12_contract_price === "" ||
                        e._12_contract_price === null ||
                        e._12_contract_price === undefined
                    )
                        ? { currency: '', amount: '' }
                        : buildCurrencyAmount(objLineFirst._11_currency_display, contractPrice),
                vat: vat === 0 &&
                    arrLine01.every(e =>
                        e._13_vat === "" ||
                        e._13_vat === null ||
                        e._13_vat === undefined 
                    )
                        ? { currency: '', amount: '' }
                        : buildCurrencyAmount(objLineFirst._11_currency_display, vat),
                typeOfContract: objLineFirst._14_type_of_contract_display || "",
                commencementDate: objLineFirst._15_date_of_commencement || "",
                completionDate: objLineFirst._16_date_of_completion || "",
                retention: objLineFirst._17_retention_display || "",
                insurance: objLineFirst._18_insurance_display || "",
                warranty: objLineFirst._19_warranty_display || "",
                maintenance: objLineFirst._20_maintenance || "",
                termsOfPayment: objLineFirst._21_terms_of_payment || ""
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
