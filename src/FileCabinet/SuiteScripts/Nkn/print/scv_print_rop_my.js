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
    '../cons/scv_cons_search_print_rop_my_01.js',
    '../cons/scv_cons_search_print_rop_my_02.js',
], (
        record, url, runtime,search,
        libPdf,
        commonExtPerformance,

        constFormat,
        constRecord,
        constRole,
        constSubsidiary,
        constSearchRopMy01,
        constSearchRopMy02,
        
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknMy.ID) return false;

            let arrVendbill = constSearchRopMy01.getDataSource({
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
                    printFile: "scv_print_rop_my",
                }   
            });

            form.addButton({
                id: "custpage_scv_btn_print_rop_my_pdf",
                label: "ROP (MY)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_rop_my");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_rop_my");

            return filePDF;
        };

        const rennderPDF = (curRec) => {
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});

            const renderer = libPdf.renderTemplateWithXml("scv_print_rop_my");

            renderer.addRecord('subsidiary', subsidiaryRec);

            let objResult = {};
            const arrVendbill = constSearchRopMy01.getDataSource({
                internalid: curRec.id
            }) || [];

            let objLineFirst = arrVendbill[0] ?? {};
            let po_internal_id = objLineFirst.po_internal_id;

            const arrPrevApproval = constSearchRopMy02.getDataSource({
                internalid: po_internal_id
            }) || [];

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
            let totalContract = 0;
            let totalAccuApproval = 0;
            let totalPrevApproval = 0;
            let totalNowApproved = 0;
            let totalPresentRetention = 0;

            let retentionLabel = '';

            let arrItem = arrVendbill.map(item => {
                let objSS2 = arrPrevApproval.find(itemSS2 =>
                    itemSS2.po_internal_id === item.po_internal_id &&
                    itemSS2._3_ori_line_id === item.ori_line_id
                ) || {};
                let contract = item._9_contract_amount * 1 || 0;
                let nowApproved = item._10_now_approved * 1 || 0;
                let prevApproval = objSS2._2_prev_approval * 1 || 0;
                let accuApproval = nowApproved + prevApproval;

                let retention = parseFloat(item._11_retention) || 0;
                let presentRetention = nowApproved * retention / 100;

                if (!retentionLabel && item._11_retention) {
                    retentionLabel = item._11_retention;
                }

                totalContract += contract;
                totalAccuApproval += accuApproval;
                totalPrevApproval += prevApproval;
                totalNowApproved += nowApproved;
                totalPresentRetention += presentRetention;

                return {
                    invRefNo: libPdf.formatDataXML(item._6_inv_ref_no || ''),
                    poNo: libPdf.formatDataXML(item._7_po_no || ''),
                    workItemDisplay: libPdf.formatDataXML(item._8_work_item_no || ''),
                    contract: formatNumberByKey(contract),
                    accuApproval: formatNumberByKey(accuApproval),
                    prevApproval: formatNumberByKey(prevApproval),
                    nowApproved: formatNumberByKey(nowApproved),
                    presentRetention: formatNumberByKey(presentRetention)
                };
            });

            objResult = {
                pjName: (objLookup['custrecord_scv_project_source.companyname'] || '').split(':').slice(1).join(':').trim(),
                pjCode: objLookup['custrecord_scv_project_source.entityid'] || '',
                claimantNo: objLineFirst._1_claimant_no || '',
                claimantName: objLineFirst._2_claimant_name || '',
                documentNumber: objLineFirst._3_document_number || '',
                certifiedDate: objLineFirst._4_certified_date || '',
                paymentDate: objLineFirst._5_payment_date || '',
                invRefNo: objLineFirst._6_inv_ref_no || '',
                poNo: objLineFirst._7_po_no || '',
                remark: objLineFirst._12_remark || '',
                retentionLabel: retentionLabel,
                arrItem,
                totalContract: formatNumberByKey(totalContract),
                totalAccuApproval: formatNumberByKey(totalAccuApproval),
                totalPrevApproval: formatNumberByKey(totalPrevApproval),
                totalNowApproved: formatNumberByKey(totalNowApproved),
                totalPresentRetention: formatNumberByKey(totalPresentRetention),
                totalBalance: formatNumberByKey(
                    totalNowApproved - totalPresentRetention
                )
            };
            libPdf.formatDataXMLWithObject(objResult);
            objResult.tagImgLogo =  libPdf.createImageBySubsidiaryV2(subsidiaryRec, 60);
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
