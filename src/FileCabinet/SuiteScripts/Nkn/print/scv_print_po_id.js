/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  10 Sep 2026         Thanh Hoan              Add button PO (VN) trên màn hình Purchase Order  from mr. Quân (https://app.clickup.com/t/3773072/86d3w9emj)
 *  15 Sep 2026         Thanh Hoan              Init, create file, PO_INDO, from mr.Quân(https://app.clickup.com/t/3773072/86d3w9emj)
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
            log.error("hoan check 1")
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
            log.error("hoan check 2")

            form.addButton({
                id: "custpage_scv_btn_print_po_id_pdf",
                label: "PO (ID)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_po_id");
            log.error("hoan check 3")
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
            let objResult = {};
            let objLineFirst = arrLine01[0] ?? {};

            let workItemCode = [];
            let contractPrice = 0;
            let vat = 0;
            let grandTotalPrice = 0;

            arrLine01.forEach(item => {
                if (item._10_work_item_code) {
                    workItemCode.push(item._10_work_item_code);
                }

                contractPrice += Number(item._12_contract_price) || 0;
                vat += Number(item._13_vat) || 0;
                grandTotalPrice += Number(item._14_grand_total_price) || 0;
            });

            workItemCode = workItemCode.join(", ");
            objResult = {
                project: objLineFirst._1_projects_display || "",
                subCon: objLineFirst._2_sub_contractor_s_name || "",
                subConAddress: objLineFirst._3_sub_contractor_s_address || "",
                subConPhone: objLineFirst._4_sub_contractor_s_phone || "",
                subConFax: objLineFirst._5_sub_contractor_s_fax || "",
                attention: objLineFirst._6_attention_display || "",
                date: objLineFirst._7_date || "",
                poNumber: objLineFirst._8_p_o_no || "",
                yourRef: objLineFirst._9_your_ref || "",
                workItemCode: workItemCode || "",
                scopeOfWork: objLineFirst._11_scope_of_work || "",
                contractPrice: contractPrice ,
                vat: vat ,
                grandTotalPrice: grandTotalPrice ,
                typeOfContract: objLineFirst._15_type_of_contract_display || "",
                commencementDate: objLineFirst._16_date_of_commencement || "",
                completionDate: objLineFirst._17_date_of_completion || "",
                retention: objLineFirst._18_retention_display || "",
                insurance: objLineFirst._19_insurance_display || "",
                warranty: objLineFirst._20_warranty_display || "",
                maintenance: objLineFirst._21_maintenance || "",
                attachments: objLineFirst._22_attachments.replace(/\r?\n/g, '<br/>') || "",
                termsOfPayment:  objLineFirst._23_terms_of_payment.replace(/\r?\n/g, '<br/>') ||  "" ,
            };

            if(!isNaN(objResult.contractPrice)){
                objResult.contractPrice = formatNumberByKey(objResult.contractPrice);
            }
            if(!isNaN(objResult.vat)){
                objResult.vat = formatNumberByKey(objResult.vat);
            }
            if(!isNaN(objResult.grandTotalPrice)){
                objResult.grandTotalPrice = formatNumberByKey(objResult.grandTotalPrice);
            }

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

        return { addBtnPrint, generateFilePDF };
    });
