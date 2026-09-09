/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  03 Sep 2026         Phu Pham                Init, create file, P2P_RequestPayment_PrintForm, from mr.Quân (https://app.clickup.com/t/3773072/86d3w9cnt)
 */
define([
    "N/record", "N/url", 'N/runtime',
    "../lib/scv_lib_pdf.js",
    '../common/scv_common_ext_performent.js',

    '../cons/scv_cons_format.js',
    '../cons/scv_cons_record.js',
    '../cons/scv_cons_role.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_billprintform_sg.js',
    '../cons/scv_cons_search_po_prepayment_sg.js',
    '../cons/scv_cons_search_prev_apv_retention_sg.js',
], (
        record, url, runtime,
        libPdf,
        commonExtPerformance,

        constFormat,
        constRecord,
        constRole,
        constSubsidiary,
        constSearchBillPrintFormSG,
        constSearchPoPrepaymentSG,
        constSearchPrevApvRetentionSG,
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknSg.ID) return false;

            let arrVendbill = constSearchBillPrintFormSG.getDataSource({
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
                    printFile: "scv_print_rop_sg",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_rop_sg_pdf",
                label: "ROP (SG)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_rop_sg");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_rop_sg");

            return filePDF;
        };

        const rennderPDF = (curRec) =>{
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});

            const renderer = libPdf.renderTemplateWithXml("scv_print_rop_sg");

            renderer.addRecord('subsidiary', subsidiaryRec);

            const showNullDisplay = (_value) => _value?.toString() ? _value : "Not Applicable";

            const arrVendbill = constSearchBillPrintFormSG.getDataSource({
                internalid: curRec.id
            });
            let objLineFirst = arrVendbill[0] ?? {};
            let po_internal_id = objLineFirst.po_internal_id;

            const objCurMonth = Object.fromEntries(
                (objLineFirst?._13_current_month ?? '')
                    .split('|')
                    .map((v, i) => [i === 0 ? 'start' : 'end', v])
            );

            const objNextMonth = Object.fromEntries(
                (objLineFirst?._14_next_month ?? '')
                    .split('|')
                    .map((v, i) => [i === 0 ? 'start' : 'end', v])
            );

            const objP2PReqPayment = handleDataTblP2PReqPayment(arrVendbill, po_internal_id);

            let objResult = {
                tagImgLogo: libPdf.createImageBySubsidiaryV2(subsidiaryRec, 120),
                date: objLineFirst._1_date,
                claimant_no: objLineFirst._2_claimant_no,
                claimant_name: objLineFirst._3_claimant_name,
                objCurMonth: objCurMonth,
                objNextMonth: objNextMonth,
                
                arrP2PReqPayment: objP2PReqPayment.arrResult,
                objTtlContract: objP2PReqPayment.objTtlContract,
                arrPOPrePayment: objP2PReqPayment.arrResPOPrePay,
                objTotal: objP2PReqPayment.objTotal,
            };

            renderer.addCustomDataSource({
                format: "OBJECT",
                alias: 'result',
                data: objResult
            })

            return renderer;
        }

        const handleDataTblP2PReqPayment = (arrVendbill, po_internal_id) => {
            const DEFAULT_ROW_COUNT = 4;
            let arrPOPrePayment = [];
            let arrApvRetention = [];

            if(!!po_internal_id) {
                arrPOPrePayment = constSearchPoPrepaymentSG.getDataSource({
                    createdfrom: po_internal_id
                });

                arrApvRetention = constSearchPrevApvRetentionSG.getDataSource({
                    internalid: po_internal_id
                });
            }

            // TODO: first table
            const arrResult = [];
            let objTtlContract = {
                description: "Total Contract Sum"
            };
            let keyFormat = ["contract", "accu_approval", "prev_approval", "now_apprvd", "present_retention", "gst_9"];

            for(let objVendbill of arrVendbill) {
                let objFindApvReten = arrApvRetention.find(e => e.po_internal_id == objVendbill.po_internal_id && e._1_item == objVendbill._6_work_item && e._3_ori_line_id == objVendbill._12_ori_line_id);

                let objRes = {
                    is_default: "F",
                    inv_ref_no: objVendbill._4_inv_ref_no,
                    p_o_no: objVendbill._5_p_o_no,
                    work_item: objVendbill._6_work_item,
                    work_item_display: objVendbill._6_work_item_display,
                    contract: objVendbill._7_contract * 1,
                    accu_approval: objVendbill._8_accu_approval * 1,
                    prev_approval: objFindApvReten._2_prev_approval_incl_retention * 1,
                    now_apprvd: objVendbill._9_now_apprvd * 1,
                    present_retention: objVendbill._10_present_retention * 1,
                    gst_9: objVendbill._11_gst_9 * 1,
                };

                addSummaryObjNumberByKeys(objTtlContract, objRes, keyFormat);
                addFormatObjNumberByKeys(objRes, keyFormat);

                arrResult.push(objRes);
            }

            addFormatObjNumberByKeys(objTtlContract, keyFormat);
            if(arrResult.length < DEFAULT_ROW_COUNT) {
                for(let i = arrResult.length; i < DEFAULT_ROW_COUNT; i++) {
                    arrResult.push({
                        is_default: "T",
                        inv_ref_no: "", p_o_no: "", work_item_display: "",
                    });
                }
            }

            // TODO: second table
            let objTtlPoPrePay = {
                description: "Total PO Pre Payment Sum"
            };
            const arrResPOPrePay = arrPOPrePayment.map(obj => {
                const objRes = {
                    is_default: "F",
                    account_number: obj._1_account_number,
                    contract: obj._3_amount * 1,
                };

                const contract_ratio = objTtlContract.contract ? (objRes.contract / objTtlContract.contract) : 0;

                objRes.accu_approval = contract_ratio * objTtlContract.accu_approval;
                objRes.prev_approval = contract_ratio * objTtlContract.prev_approval;
                objRes.now_apprvd = contract_ratio * objTtlContract.now_apprvd;
                objRes.present_retention = contract_ratio * objTtlContract.present_retention;
                objRes.gst_9 = contract_ratio * objTtlContract.gst_9;

                addFormatObjNumberByKeys(objRes, keyFormat);
                addSummaryObjNumberByKeys(objTtlPoPrePay, objRes, keyFormat);
                return objRes;
            });

            addFormatObjNumberByKeys(objTtlPoPrePay, keyFormat);
            objTtlContract.is_default = arrResPOPrePay.length > 0 ? "F" : "T";
            if(arrResPOPrePay.length < DEFAULT_ROW_COUNT) {
                for(let i = arrResPOPrePay.length; i < DEFAULT_ROW_COUNT; i++) {
                    arrResPOPrePay.push({
                        is_default: "T", account_number: ""
                    });
                }
            }

            // TODO: calc total two table
            const objTotal = calculateCombinedTotal(objTtlContract, objTtlPoPrePay, keyFormat);

            return {
                arrResult,
                objTtlContract,
                arrResPOPrePay,
                objTtlPoPrePay,
                objTotal
            };
        }

        const calculateCombinedTotal = (objTtlContract, objTtlPoPrePay, keys) => {
            const objTotal = {
                description: "TOTAL"
            };

            keys.forEach(key => {
                objTotal[key] = (objTtlContract[key] || 0) + (objTtlPoPrePay[key] || 0);
            });

            addFormatObjNumberByKeys(objTotal, keys);
            return objTotal;
        }

        const addSummaryObjNumberByKeys = (objTtlContract, objRes, keys) => {
            keys.forEach(key => {
                objTtlContract[key] = (objTtlContract[key] || 0) + (objRes[key] || 0);
            });
        }

        const addFormatObjNumberByKeys = (obj, keys) => {
            keys.forEach(key => {
                if(obj[key] !== undefined && obj[key] !== null) {
                    obj[key + "_fmt"] = formatNumberByKey(obj[key]);
                }
            });
        }
        
        const formatNumberByKey = (_number) =>{
            return constFormat.formatNumber(_number, 2, {
                groupSeparator: ',',
                decimalSeparator: '.',
            });
        }

        return { addBtnPrint, generateFilePDF };
    });
