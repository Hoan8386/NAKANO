/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  21 Sep 2026         Thanh Hoan              Add button PO (VN) trên màn hình Purchase Order  from mr. Quân (https://app.clickup.com/t/3773072/86d3w9emj)
 */
define([
    "N/record", "N/url", 'N/runtime','N/search',
    "../lib/scv_lib_pdf.js",
    '../common/scv_common_ext_performent.js',

    '../cons/scv_cons_format.js',
    '../cons/scv_cons_record.js',
    '../cons/scv_cons_role.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_print_po_th_01.js',
], (
        record, url, runtime,search,
        libPdf,
        commonExtPerformance,

        constFormat,
        constRecord,
        constRole,
        constSubsidiary,
        constSearchPrintPOTH01,
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknTh.ID) return false;

            let arrLine01 = constSearchPrintPOTH01.getDataSource({
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
                    printFile: "scv_print_po_th",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_po_th_pdf",
                label: "PO (TH)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_po_th");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_po_th");

            return filePDF;
        };

        const rennderPDF = (curRec) => {
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({ type: "subsidiary", id: subsidiaryId });

            const renderer = libPdf.renderTemplateWithXml("scv_print_po_th");
            renderer.addRecord('subsidiary', subsidiaryRec);

            let arrLine01 = constSearchPrintPOTH01.getDataSource({
                internalid: curRec.id
            });

            log.error("arrLine01", arrLine01);

            let objLineFirst = arrLine01[0] ?? {};

            let projectId = curRec.getValue('cseg_scv_sg_proj');
            let objLookup = search.lookupFields({
                type: 'customrecord_cseg_scv_sg_proj',
                id: projectId,
                columns: [
                    'custrecord_scv_project_source.projectmanager',
                    'custrecord_scv_project_source.companyname'
                ]
            });

            let totalAmount = 0;
            let totalTaxAmount = 0;
            let vatPercent = objLineFirst._16_vat || "0";
            let lines = arrLine01.map((row, index) => {
                let rate = row._14_rate * 1 || 0;
                let amount = row._15_amount * 1 || 0;
                let tax = row._17_tax_amount * 1 || 0;
                totalAmount += amount;
                totalTaxAmount += tax;
                return {
                    no: index + 1,
                    item: row._10_item_display || row._10_item || "",  // 14. Item
                    quantity: row._12_quantity || "0",                  // 15. Quantity
                    description: row._12_description || "",            // 16. Description
                    rate: formatNumberByKey(rate),                     // 17. Unit Price
                    amount: formatNumberByKey(amount)                  // 18. Amount
                };
            });

            let grandTotal = totalAmount + totalTaxAmount;

            let objResult = {
                claimantNo: objLineFirst._1_claimant_no || "",
                claimantName: objLineFirst._2_claimant_s_name || "",
                claimantAddress: objLineFirst._3_claimant_s_address || "",
                quotationNo: objLineFirst._4_quotation_no || "",
                quotationDate: objLineFirst._5_quotation_date || "",
                poNumber: objLineFirst._6_p_o_no || "",
                pjName: objLookup['custrecord_scv_project_source.companyname'] || '',
                pjManager: objLookup['custrecord_scv_project_source.projectmanager'] || '',
                date: objLineFirst._7_date || "",
                claimantPhone: objLineFirst._8_claimant_s_phone || "",
                claimantFax: objLineFirst._9_claimant_s_fax || "",
                termsOfPayment: objLineFirst._18_terms_of_payment || "",
                placeOfDelivery: objLineFirst._19_place_of_delivery || "",
                dateOfDelivery: objLineFirst._20_date_of_delivery || "",
                remark: objLineFirst._17_remark || "",
                lines: lines,
                totalAmount: formatNumberByKey(totalAmount),         
                vatLabel: `VAT ${vatPercent}%`,                     
                vatPercent: vatPercent,
                taxAmount: formatNumberByKey(totalTaxAmount),        
                grandTotal: formatNumberByKey(grandTotal)             
            };

            libPdf.formatDataXMLWithObject(objResult);

            objResult.tagImgLogo = libPdf.createImageBySubsidiaryV2(subsidiaryRec, 120);

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
