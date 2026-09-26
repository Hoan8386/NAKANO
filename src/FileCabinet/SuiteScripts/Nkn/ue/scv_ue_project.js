/**
 * Nội dung:
 * =======================================================================================
 *  Date                Author                  Description
 *  20 Aug 2026         Huy Pham                Init, create file. Chức năng tạo tự động & Update  Project segment khi tạo & update Project, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d43037h)
 *  24 Aug 2026         Huy Pham                Sinh mã Project Code, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d444yau)
 *  15 Sep 2026         Huy Pham                Create RPO (Requisition) from Project_WBS, from ms.Ngọc(https://app.clickup.com/t/3773072/14yhnhmfjj0)
 *  22 Sep 2026         Huy Pham                Điều chỉnh sinh mã Project Code độc lập, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d444yau?comment=1300230000032342)
 *  23 Sep 2026         Huy Pham                Fix Make copy Project không sinh mã mới, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d444yau)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
        '../common/scv_common_project_code.js',
        '../common/scv_common_project2csegproject.js',
        '../common/scv_common_wbs2rpo.js',
        '../common/scv_common_project_calculate.js',
    ],

    (
        commProjectCode,
        commProject2CsegProject,
        commonWbs2Rpo,
        commonProjectCalc,
    ) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            commonWbs2Rpo.addBtnCreateRPO(scriptContext);
            commonProjectCalc.addBtnCalcNetCost(scriptContext);

            //Job ID do hệ thống sinh, không cho user nhập tay
            commProjectCode.disableFieldProjectCode(scriptContext);

            //Make copy: xóa Job ID & Project Segment của Project nguồn để bản ghi mới được sinh mã lại
            commProjectCode.resetCodeOnCopy(scriptContext);
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            let triggerType = scriptContext.type;
            let newRec = scriptContext.newRecord;

            //Create (gồm cả Save bản Make copy - NetSuite không trả type "copy" ở beforeSubmit): luôn chạy;
            //Edit: chỉ chạy khi user thay đổi Type of Job / Classification / Parent / Start date / Subsidiary / Job ID (so oldRecord vs newRecord)
            if (["create", "copy"].includes(triggerType)
                || (triggerType == "edit" && commProjectCode.isGenFieldsChanged(scriptContext.oldRecord, newRec))) {

                commProjectCode.genProjectCode(newRec, triggerType, scriptContext.oldRecord);
            }

            if(["create", "edit"].includes(triggerType)){
                commonProjectCalc.autoCalcProject(newRec);
            }
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            let triggerType = scriptContext.type;
            let newRec = scriptContext.newRecord;

            if (["create", "edit", "copy"].includes(triggerType)) {
                commProject2CsegProject.updateCsegProject(newRec);
            }
        }

        return {
            beforeLoad,
            beforeSubmit,
            afterSubmit
        }

    });
