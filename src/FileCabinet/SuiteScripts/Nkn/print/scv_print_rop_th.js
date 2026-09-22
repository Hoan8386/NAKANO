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
    '../cons/scv_cons_search_print_rop_th_01.js',
    '../cons/scv_cons_search_print_rop_th_02.js',
], (
        record, url, runtime,search,
        libPdf,
        commonExtPerformance,

        constFormat,
        constRecord,
        constRole,
        constSubsidiary,
        constSearchRopTh01,
        constSearchRopTh02,
        
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknTh.ID) return false;

            let arrVendbill = constSearchRopTh01.getDataSource({
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
                    printFile: "scv_print_rop_th",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_rop_th_pdf",
                label: "ROP (TH)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_rop_th");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_rop_th");

            return filePDF;
        };

        const rennderPDF = (curRec) => {
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});
            const renderer = libPdf.renderTemplateWithXml("scv_print_rop_th");
            renderer.addRecord('subsidiary', subsidiaryRec);
            let objResult = {};
            const arrVendbill = constSearchRopTh01.getDataSource({
                internalid: curRec.id
            });
            const arrPrevApproval = constSearchRopTh02.getDataSource();
            //  log.error("hoan arrVendbill " ,arrVendbill)
            //  log.error("hoan arrPrevApproval " ,arrPrevApproval)

            let projectId = curRec.getValue('cseg_scv_sg_proj');
            let objLookup = {};
            if(projectId) {
                objLookup = search.lookupFields({
                    type: 'customrecord_cseg_scv_sg_proj',
                    id: projectId,
                    columns: [
                        'custrecord_scv_project_source.entityid',
                        'custrecord_scv_project_source.companyname'
                    ]
                });
            }
            let objLineFirst = arrVendbill[0] ?? {};
            let totalContract = 0;
            let totalPrevApproved = 0;
            let totalNewApproval = 0;
            let totalPresentRetention = 0;
            let totalApprovedAccumulation = 0;
            let totalVat = 0;
            let arrItem = arrVendbill.map((item, index) => {
                let objSS2 = arrPrevApproval.find(itemSS2 =>
                    itemSS2.po_internal_id === item.po_internal_id &&
                    itemSS2._3_ori_line_id === item.ori_line_id
                ) || {};
                let contractAmount = item._8_contract_amount * 1 || 0;
                let newApproval = item._9_new_approval * 1 || 0;
                let prevApproval = objSS2._2_prev_approval * 1 || 0;
                let retention = item._10_retetion * 1 || 0;
                let presentRetention = newApproval * retention;
                let approvedAccumulation = prevApproval + newApproval;
                let vat = item._11_vat * 1 || 0;
                totalContract += contractAmount;
                totalApprovedAccumulation += approvedAccumulation;
                totalPrevApproved += prevApproval;
                totalNewApproval += newApproval;
                totalPresentRetention += presentRetention;
                totalVat += vat;
                return {
                    no: index + 1,
                    invRefNo: item._5_inv_ref_no || '',
                    poNo: item._6_po_no || '',
                    workItemDisplay: item._7_work_item_no_display || item._7_work_item_no || '',
                    contract: formatNumberByKey(contractAmount),
                    approvedAccumulation: formatNumberByKey(approvedAccumulation),
                    prevApproved: formatNumberByKey(prevApproval),
                    newApproval: formatNumberByKey(newApproval),
                    presentRetention: formatNumberByKey(presentRetention),
                    vat: formatNumberByKey(vat),
                    status: ''
                };
            });
            objResult = {
                tagImgLogo: libPdf.createImageBySubsidiaryV2(subsidiaryRec, 120),
                pjName: objLookup['custrecord_scv_project_source.companyname'] || '',
                pjCode: objLookup['custrecord_scv_project_source.entityid'] || '',
                docNo: objLineFirst._1_document_number || '',
                date: objLineFirst._2_date || '',
                vendorCode: objLineFirst._3_vendor_code || '',
                vendorName: objLineFirst._4_vendor_name || '',
                arrItem,
                totalContract: formatNumberByKey(totalContract),
                totalApprovedAccumulation: formatNumberByKey(totalApprovedAccumulation),
                totalPrevApproved: formatNumberByKey(totalPrevApproved),
                totalNewApproval: formatNumberByKey(totalNewApproval),
                totalPresentRetention: formatNumberByKey(totalPresentRetention),
                totalVat: formatNumberByKey(totalVat),
                totalNewApprovalVatIncluded: formatNumberByKey(totalNewApproval + totalVat),
                remark: objLineFirst._12_memo || ''
            };

            // log.error("hoan arr",objResult.arrItem);
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
