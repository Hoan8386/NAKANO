/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  16 Sep 2026         Thanh Hoan              Init, create file, P2P_RequestPayment_PrintForm, from mr.Quân (https://app.clickup.com/t/3773072/86d3w9cnt)
 */
define([
    "N/record", "N/url", 'N/runtime','N/search',
    "../lib/scv_lib_pdf.js",
    '../common/scv_common_ext_performent.js',

    '../cons/scv_cons_format.js',
    '../cons/scv_cons_record.js',
    '../cons/scv_cons_role.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_print_rop_id_01.js',
    '../cons/scv_cons_search_print_rop_id_02.js',
], (
        record, url, runtime,search,
        libPdf,
        commonExtPerformance,

        constFormat,
        constRecord,
        constRole,
        constSubsidiary,
        constSearchRopId01,
        constSearchRopId02,
        
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknId.ID) return false;

            let arrVendbill = constSearchRopId01.getDataSource({
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
                    printFile: "scv_print_rop_id",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_rop_id_pdf",
                label: "ROP (ID)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_rop_id");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_rop_id");

            return filePDF;
        };

        const rennderPDF = (curRec) =>{
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});

            const renderer = libPdf.renderTemplateWithXml("scv_print_rop_id");

            renderer.addRecord('subsidiary', subsidiaryRec);

            const showNullDisplay = (_value) => _value?.toString() ? _value : "Not Applicable";
            let objResult ={}
            const arrVendbill = constSearchRopId01.getDataSource({
                internalid: curRec.id
            });

            let projectId = curRec.getValue('cseg_scv_sg_proj');
            let objLookup = search.lookupFields({
                type: 'customrecord_cseg_scv_sg_proj',
                id: projectId,
                columns: ['custrecord_scv_project_source.entityid' , 'custrecord_scv_project_source.companyname' ]
            });

            log.error("hoan arrVendbill" , arrVendbill);
            let objLineFirst = arrVendbill[0] ?? {};

            objResult = {
                tagImgLogo: libPdf.createImageBySubsidiaryV2(subsidiaryRec, 120),
                pjName: objLookup['custrecord_scv_project_source.companyname'] || '',
                pjCode: objLookup['custrecord_scv_project_source.entityid'].split('') || '',
                docNumber: objLineFirst._1_document_number || '',
                date: objLineFirst._2_date || '',
                claimantNo: objLineFirst._3_claimant_no.split('') || '',
                claimantName: objLineFirst._4_claimant_name || '',
                invRefNo: objLineFirst._5_inv_ref_no || '',
                poNo: objLineFirst._6_po_no || '',
                workItem: objLineFirst._7_work_item || '',
                workItemDisplay: objLineFirst._7_work_item_display || '',
                contract: objLineFirst._8_contract || '',
                currentlyApproved: objLineFirst._9_currently_approved || '',
                memo: objLineFirst._10_memo || '',
                remark: objLineFirst._11_remark || '',
                ropReceivedOn: objLineFirst._12_rop_received_on || '',
                paymentDate: objLineFirst._13_payment_date || '',
                vat: objLineFirst._14_vat || '',
                retention: objLineFirst._15_retetion || '',
                retentionDisplay: objLineFirst._15_retetion_display || '',
            };

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
