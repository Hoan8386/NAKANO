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

        const rennderPDF = (curRec) => {
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});

            const renderer = libPdf.renderTemplateWithXml("scv_print_rop_id");

            renderer.addRecord('subsidiary', subsidiaryRec);

            let objResult = {};
            const arrVendbill = constSearchRopId01.getDataSource({
                internalid: curRec.id
            });
            const arrPrevApproval = constSearchRopId02.getDataSource();

            // log.error("hoan arrVendbill " ,arrVendbill)
            // log.error("hoan arrPrevApproval " ,arrPrevApproval)
            let projectId = curRec.getValue('cseg_scv_sg_proj');
            let objLookup = search.lookupFields({
                type: 'customrecord_cseg_scv_sg_proj',
                id: projectId,
                columns: [
                    'custrecord_scv_project_source.entityid',
                    'custrecord_scv_project_source.companyname'
                ]
            });


            let objLineFirst = arrVendbill[0] ?? {};

            let totalContract = 0;
            let totalPrevApproved = 0;
            let totalCurrentlyApproved = 0;
            let totalPresentRetention = 0;
            let totalApprovedAccumulation = 0;

            let arrItem = arrVendbill.map(item => {
                let objSS2 = arrPrevApproval.find(itemSS2 =>
                    itemSS2.po_internal_id === item.po_internal_id &&
                    itemSS2._3_ori_line_id === item.ori_line_id
                ) || {};

                let currentlyApproved = item._9_currently_approved * 1 || 0;
                let prevApproved = objSS2._2_prev_approval_incl_retention * 1 || 0;
                let approvedAccumulation = currentlyApproved + prevApproved || 0;
                let retention = parseFloat(item._15_retetion) || 0;
                log.error("hoan retention" , retention)

                totalContract += item._8_contract * 1 || 0;
                totalApprovedAccumulation += approvedAccumulation;
                totalPrevApproved += prevApproved;
                totalCurrentlyApproved += currentlyApproved;
                
                let retentionAmount = currentlyApproved * retention / 100;
                totalPresentRetention += retentionAmount;
                return {
                    invRefNo: item._5_inv_ref_no || '',
                    poNo: item._6_po_no || '',
                    workItemDisplay: item._7_work_item_display || '',
                    contract: formatNumberByKey(item._8_contract),
                    approvedAccumulation: formatNumberByKey(approvedAccumulation),
                    prevApproved: formatNumberByKey(prevApproved),
                    currentlyApproved: formatNumberByKey(currentlyApproved),
                    presentRetention: formatNumberByKey(retentionAmount)
                };
            });

            objResult = {
                tagImgLogo: libPdf.createImageBySubsidiaryV2(subsidiaryRec, 120),
                // pjName: objLookup['custrecord_scv_project_source.companyname'] || '',
                pjName: (objLookup['custrecord_scv_project_source.companyname'] || '').split(':').slice(1).join(':').trim(),
                pjCode: objLookup['custrecord_scv_project_source.entityid'] || '',
                docNumber: objLineFirst._1_document_number || '',
                dateFormatDDMMYYYY: formatDate(objLineFirst._2_date) || '',
                date: objLineFirst._2_date || '',
                claimantNo: objLineFirst._3_claimant_no || '',
                claimantName: objLineFirst._4_claimant_name || '',
                memo: objLineFirst._10_memo || '',
                remark: objLineFirst._11_remark || '',
                ropReceivedOn: objLineFirst._12_rop_received_on || '',
                paymentDate: objLineFirst._13_payment_date || '',
                vat: objLineFirst._14_vat || '',
                retention: objLineFirst._15_retetion || '',
                retentionDisplay: objLineFirst._15_retetion_display || '',
                arrItem,
                totalContract: formatNumberByKey(totalContract),
                totalApprovedAccumulation: formatNumberByKey(totalApprovedAccumulation),
                totalPrevApproved: formatNumberByKey(totalPrevApproved),
                totalCurrentlyApproved: formatNumberByKey(totalCurrentlyApproved),
                totalPresentRetention: formatNumberByKey(totalPresentRetention)
            };

            log.error("hoan check objResult" ,objResult);
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

        const formatDate = (_value) => {
            if (!_value) return "";
            let date = new Date(_value);
            return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        }
        return { addBtnPrint, generateFilePDF };
    });
