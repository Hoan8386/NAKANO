/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  09 Sep 2026         Thanh Hoan              Add button RPO (VN) trên màn hình Requisition  from mr. Quân (https://app.clickup.com/t/3773072/86d3w9a1h)
 */
define([
    "N/record", "N/url", 'N/search', 'N/query', 'N/file', 'N/runtime',
    '../olib/alasql/alasql.min@4.6.6.js', 
    "../lib/scv_lib_pdf.js",
    '../lib/scv_lib_function',
    '../common/scv_common_ext_performent.js',

    '../cons/scv_cons_record.js',
    '../cons/scv_cons_search.js',
    '../cons/scv_cons_format.js',
    '../cons/scv_cons_role.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_print_rpo_vn_01.js',
], (
        record, url, search, query, file, runtime,
        alasql,
        libPdf,
        lbf,
        commonExtPerformance,

        constRecord,
        constSearch,
        constFormat,
        constRole,
        constSubsidiary,
        constSearchPrintRPOVN01,
    ) => {

        const validatePrint = (curRec) =>{
            let curUser = runtime.getCurrentUser();

            log.error("hoan check" , curUser);
            if(curUser.role !== constRole.Records.Administrator.ID && curUser.subsidiary != constSubsidiary.Records.NknVn.ID) return false;

            let arrLine01 = constSearchPrintRPOVN01.getDataSource({
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
                    printFile: "scv_print_rpo_vn",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_print_rpo_vn_pdf",
                label: "RPO (VN)",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_rpo_vn");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_rpo_vn");

            return filePDF;
        };

        const rennderPDF = (curRec) =>{
            const renderer = libPdf.renderTemplateWithXml("scv_print_rpo_vn");
            let subsidiaryId = curRec.getValue("subsidiary");
            let subsidiaryRec = record.load({type: "subsidiary", id: subsidiaryId});
            const arrResDatas = [];

            const lkStores = {
                vendors: []
            };

            let arrLine01 = constSearchPrintRPOVN01.getDataSource({
                internalid: curRec.id
            });
            
            let objLineFirst = arrLine01[0] ?? {};
            log.error("Hoan",arrLine01)

            let projectId = curRec.getValue('cseg_scv_sg_proj');
            let objLookup = search.lookupFields({
                type: 'customrecord_cseg_scv_sg_proj',
                id: projectId,
                columns: ['custrecord_scv_project_source.entityid' , 'custrecord_scv_project_source.companyname' ]
            });

            let totalAmount = 0;
            arrLine01.forEach(item => {
                totalAmount += Number(item._25_this_amount) || 0;
            });
            const objResHeaders = {
                pjCode: objLookup['custrecord_scv_project_source.entityid'] || '',
                pjName: objLookup['custrecord_scv_project_source.companyname'] || '',
                vendor: objLookup.companyname || '',
                SCofWork:objLineFirst._1_scope_of_work,
                totalAmount:libPdf.formatNumber(totalAmount),
                currency:objLineFirst._2_currency,
                note:objLineFirst._3_note,
                typeOfCt:objLineFirst._4_type_of_contract,
                docNum:objLineFirst._5_document_number,
                datePO:objLineFirst._6_date_of_request_for_po,
                dateCommencement:objLineFirst._7_date_of_commencement,
                dateCompletion:objLineFirst._8_date_of_completion,
                mainPride:objLineFirst._9_maintenance_pride,
                warranty:objLineFirst._10_warranty,
                insurance:objLineFirst._11_insurance_display,
                quoNo:objLineFirst._12_quotation_no,
                quoDate:objLineFirst._13_quotation_date,
                poNo:objLineFirst._14_po_no,
                paymentTerm:objLineFirst._15_payment_term,
                subCon:objLineFirst._16_sub_con_quotation,
                drawings:objLineFirst._17_drawings,
                schedule:objLineFirst._18_schedule,
                other:objLineFirst._19_other,
                specification:objLineFirst._20_specification ,
                retention:objLineFirst._21_retention||objLineFirst._21_retention_display,
                bankGuarantee: objLineFirst._22_bank_guarantee,
                wbNo: objLineFirst._23_w_b_no,
                workingBudget: objLineFirst._24_working_budget,
                thisAmount: objLineFirst._25_this_amount,
                accumulateAmount: objLineFirst._26_accumulate_amount,
                balance: objLineFirst._27_balance,
                remarkMemoLine: objLineFirst._28_remark_memo_line,
                remark: objLineFirst._29_remark,
                reasonOfExcessFromWB: objLineFirst._30_reason_of_excess_from_w_b,
                compensationProposal: objLineFirst._31_compensation_proposal,
            };

            
            libPdf.formatDataXMLWithObject(objResHeaders);
            objResHeaders.tagImgLogo = libPdf.createImageBySubsidiaryV2(subsidiaryRec, 120)
            

            renderer.addCustomDataSource({
                format: "OBJECT",
                alias: 'results',
                data: {
                    headers: objResHeaders,
                    datas: arrResDatas
                }
            });

            return renderer;
        }

        return { addBtnPrint, generateFilePDF };
    });
