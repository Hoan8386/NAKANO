/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  26 Aug 2026         Huy Pham                Init, create file, P2P_PO_PrintForm, from mr.Quân(https://app.clickup.com/t/3773072/86d3w9emj)
 */
define([
    "N/record", "N/url", 'N/runtime',
    "../lib/scv_lib_pdf.js",
    '../common/scv_common_ext_performent.js',

    '../cons/scv_cons_format.js',
    '../cons/scv_cons_record.js',
    '../cons/scv_cons_role.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_print_po_sg_01.js',
], (
        record, url, runtime,
        libPdf,
        commonExtPerformance,

        constFormat,
        constRecord,
        constRole,
        constSubsidiary,
        constSearchPrintPOSG01,
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknSg.ID) return false;

            let arrLine01 = constSearchPrintPOSG01.getDataSource({
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
                    printFile: "scv_print_po_sg",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_po_sg_pdf",
                label: "PO (SG)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_po_sg");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_po_sg");

            return filePDF;
        };

        const rennderPDF = (curRec) =>{
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});

            const renderer = libPdf.renderTemplateWithXml("scv_print_po_sg");

            renderer.addRecord('subsidiary', subsidiaryRec);

            let arrLine01 = constSearchPrintPOSG01.getDataSource({
                internalid: curRec.id
            });
            
            let objLineFirst = arrLine01[0] ?? {};

            const showNullDisplay = (_value) => _value?.toString() ? _value : "Not Applicable";

            let objResult = {
                tagImgLogo: libPdf.createImageBySubsidiaryV2(subsidiaryRec, 120),
                vendorAddress: objLineFirst._1_vendor_address,
                poNo: objLineFirst._2_p_o_no,
                date: objLineFirst._3_date,
                subContractNo: objLineFirst._4_sub_contractor_no,
                attention: objLineFirst._5_attention_display ?? objLineFirst._5_attention,
                project: objLineFirst._6_projects_display ?? objLineFirst._6_projects,
                remark_1: objLineFirst._7_remark_1,
                remark_2: objLineFirst._8_remark_2,
                remark_4: objLineFirst._23_remark_3,
                remark_5: objLineFirst._24_remark_4,
                remark_6: objLineFirst._25_remark_5,
                works: objLineFirst._9_works,
                subContractSum: objLineFirst._29_sub_contract_sum,
                typeOfSubContract: showNullDisplay(objLineFirst._11_type_of_sub_contract_display ?? objLineFirst._11_type_of_sub_contract),
                dateOfCommencement: showNullDisplay(objLineFirst._12_date_of_commencement),
                scheduledCompletionDate: showNullDisplay(objLineFirst._13_scheduled_completion_date),
                liquidatedDamages: objLineFirst._14_liquidated_damages,
                paymentPeriod: showNullDisplay(objLineFirst._15_payment_period_display ?? objLineFirst._15_payment_period),
                retention: showNullDisplay(objLineFirst._16_retention_display ?? objLineFirst._16_retention),
                limitOfRetention: objLineFirst._17_limit_of_retention,
                maintenancePeriod: showNullDisplay(objLineFirst._18_maintenance_period),
                performanceBond: showNullDisplay(objLineFirst._19_performance_bond),
                insurance: showNullDisplay(objLineFirst._20_insurance_s_display ?? objLineFirst._20_insurance_s),
                warrantiesRequired: showNullDisplay(objLineFirst._21_warranties_required_display ?? objLineFirst._21_warranties_required),
                limitOnSuspensionPeriod: showNullDisplay(objLineFirst._22_limit_on_suspension_period),
                acceptance: objLineFirst._26_acceptance,
                vendorCompanyName: objLineFirst._28_vendor_company_name,
                commitmentAndConfirmation: objLineFirst._27_commitment_and_confirmation_by_sub_contractor,
            };

            if(!isNaN(objResult.subContractSum)){
                objResult.subContractSum = formatNumberByKey(objResult.subContractSum);
            }
            if(!isNaN(objResult.liquidatedDamages)){
                objResult.liquidatedDamages = formatNumberByKey(objResult.liquidatedDamages);
            }
            if(!isNaN(objResult.limitOfRetention)){
                objResult.limitOfRetention = formatNumberByKey(objResult.limitOfRetention);
            }

            objResult.subContractSum = showNullDisplay(objResult.subContractSum);
            objResult.liquidatedDamages = showNullDisplay(objResult.liquidatedDamages);
            objResult.limitOfRetention = showNullDisplay(objResult.limitOfRetention);

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
