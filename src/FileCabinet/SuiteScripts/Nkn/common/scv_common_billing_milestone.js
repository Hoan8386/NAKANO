/**
 * Nội dung: Kiểm soát xuất hóa đơn theo Billing Schedule loại "Fixed Bid, Milestone"
 *  Action 2: Invoice - Billing Progress lấy tự động theo milestone đang xuất hóa đơn (KHÔNG cho sửa tay), tính lại Quantity, Rate, Amount
 *  Action 3: Billing Schedule - kiểm soát tick Completed: tick theo thứ tự, tối đa 1 milestone Completed chưa xuất INV
 * Billing Sequence: phần tử #1 = Initial Amount (nếu > 0), tiếp theo lần lượt các line milestone theo thứ tự line
 *  k = số INV đã tạo từ SO (không tính INV Voided / INV đang xử lý) -> INV hiện tại = phần tử thứ (k + 1)
 *  B = số milestone đã xuất INV = k - 1 nếu Initial Amount > 0 và k >= 1, ngược lại B = k
 * Mapping:
 *  Invoice line: custcol_scv_billing_progress = % phần tử (k+1); quantity = 1;
 *      amount = ROUND(jobprice × %) (INV lần cuối = jobprice - Σ INV trước); rate = amount / quantity
 * =======================================================================================
 *  Date                Author                  Description
 *  24 Sep 2026         Huy Pham                Init, create file. Billing Progress trên INV & kiểm soát Completed trên Billing Schedule, from ms.Phương Anh(https://app.clickup.com/t/3773072/14yhnhmfqun)
 */
define(['N/search', 'N/record', 'N/error',
    '../lib/scv_lib_function.js',
    '../cons/scv_cons_format.js',
    '../cons/scv_cons_billing_schedule_type.js',
], (search, record, error,
    lbf,
    constFormat,
    constBillingScheduleType,
) => {

    const ScheduleType = constBillingScheduleType.Records;

    const throwError = (_message) => {
        throw error.create({
            name: "SCV_BILLING_MILESTONE",
            message: _message,
            notifyOff: true
        });
    }

    const isMilestoneSchedule = (_bsRec) => {
        return _bsRec.getValue("scheduletype") === ScheduleType.FixedBidMilestone.ID;
    }

    /**
     * 2.1 B3: Dựng Billing Sequence theo thứ tự - #1 = Initial Amount (nếu > 0), tiếp theo các line milestone
     * @param {Record} _bsRec : Billing Schedule
     * @returns {Array} [{isInitial, lineNum (1-based, Initial = 0), percent, completed}]
     */
    const getBillingSequence = (_bsRec) => {
        let arrSeq = [];

        let initialPercent = constFormat.parsePercent(_bsRec.getValue("initialamount"));
        if(initialPercent > 0){
            //NetSuite luôn bill Initial Amount ở INV đầu tiên, không cần tick Completed
            arrSeq.push({isInitial: true, lineNum: 0, percent: initialPercent, completed: true});
        }

        let sizeMilestone = _bsRec.getLineCount("milestone");
        for(let i = 0; i < sizeMilestone; i++){
            arrSeq.push({
                isInitial: false,
                lineNum: i + 1,
                percent: constFormat.parsePercent(_bsRec.getSublistValue({sublistId: "milestone", fieldId: "milestoneamount", line: i})),
                completed: _bsRec.getSublistValue({sublistId: "milestone", fieldId: "milestonecompleted", line: i}),
            });
        }

        return arrSeq;
    }

    //C: số line milestone Completed
    const countCompleted = (_arrSeq) => {
        return _arrSeq.filter(e => !e.isInitial && e.completed).length;
    }

    //B: số milestone đã xuất INV
    const calcBilledMilestone = (_arrSeq, _k) => {
        return (_arrSeq[0]?.isInitial && _k >= 1) ? _k - 1 : _k;
    }

    /**
     * 2.1 B4: Các INV đã tạo từ SO (loại trừ INV Voided & INV đang xử lý)
     * @param {string} _soId
     * @param {string} _excludeInvId : internalid INV đang xử lý (edit)
     * @returns {Object} {k: số INV, totalAmount: Σ Amount line các INV}
     */
    const getBilledInvoices = (_soId, _excludeInvId) => {
        let filters = [
            ["createdfrom", "anyof", _soId], "AND",
            ["mainline", "is", "F"], "AND",
            ["taxline", "is", "F"], "AND",
            ["cogs", "is", "F"], "AND",
            ["shipping", "is", "F"], "AND",
            ["voided", "is", "F"],
        ];
        if(!!_excludeInvId){
            filters.push("AND", ["internalid", "noneof", _excludeInvId]);
        }

        let arrResult = search.create({
            type: "invoice",
            filters: filters,
            columns: [
                search.createColumn({name: "internalid", summary: "GROUP"}),
                //fxamount: theo currency của INV (cùng đơn vị jobprice); amount đã quy đổi base currency -> INV cuối bị âm
                search.createColumn({name: "fxamount", summary: "SUM"}),
            ]
        }).run().getRange({start: 0, end: 1000});

        return {
            k: arrResult.length,
            totalAmount: arrResult.reduce((sum, res) => sum + Math.abs(res.getValue({name: "fxamount", summary: "SUM"}) * 1), 0),
        };
    }

    /**
     * 2.1 B1, B2: Lấy SO gốc & Billing Schedule dưới line SO kế thừa từ Project. Không phải "Fixed Bid, Milestone" -> null (V1)
     * @param {string} _createdFromId : Invoice.createdfrom
     * @returns {Object|null} {soId, soTranid, jobId, bsRec, arrFromJobLine: [line id SO kế thừa từ Project]}
     */
    const getSalesOrderSchedule = (_createdFromId) => {
        if(!_createdFromId) return null;

        let transLkf = search.lookupFields({type: "transaction", id: _createdFromId, columns: ["recordtype"]});
        if(transLkf.recordtype !== "salesorder") return null;

        let soRec = record.load({type: "salesorder", id: _createdFromId});

        let billingScheduleId = "";
        let arrFromJobLine = [];
        let sizeItemSublist = soRec.getLineCount("item");
        for(let i = 0; i < sizeItemSublist; i++){
            //Line kế thừa từ Project theo chuẩn NetSuite: {fromjob} = T
            let fromJob = soRec.getSublistValue({sublistId: "item", fieldId: "fromjob", line: i});
            if(fromJob !== "T" && fromJob !== true) continue;

            arrFromJobLine.push(soRec.getSublistValue({sublistId: "item", fieldId: "line", line: i}).toString());

            if(!billingScheduleId){
                billingScheduleId = soRec.getSublistValue({sublistId: "item", fieldId: "billingschedule", line: i});
            }
        }
        if(!billingScheduleId) return null;

        let bsRec = record.load({type: "billingschedule", id: billingScheduleId});
        if(!isMilestoneSchedule(bsRec)) return null;

        return {
            soId: _createdFromId,
            soTranid: soRec.getValue("tranid"),
            jobId: soRec.getValue("job"),
            bsRec: bsRec,
            arrFromJobLine: arrFromJobLine,
        };
    }

    /**
     * Action 2 - 2.1, 2.2, 2.3: Xác định milestone đang xuất hóa đơn, validate V2 - V4 và tính Billing Progress, Quantity, Amount, Rate
     * @param {Record} _invRec : Invoice
     * @returns {Object|null} {billingProgress, quantity, rate, amount, arrFromJobLine} ; null nếu không thuộc phạm vi (V1)
     */
    const calcInvoiceBilling = (_invRec) => {
        let objSO = getSalesOrderSchedule(_invRec.getValue("createdfrom"));
        if(!objSO) return null;

        let arrSeq = getBillingSequence(objSO.bsRec);
        let n = arrSeq.length;

        let objBilled = getBilledInvoices(objSO.soId, _invRec.id);
        let k = objBilled.k;

        //V2: đã xuất đủ số lần theo Billing Schedule
        if(k + 1 > n){
            throwError(`Sales Order ${objSO.soTranid} đã xuất đủ ${n} lần hóa đơn theo Billing Schedule. Không thể tạo thêm Invoice.`);
        }

        let objSeq = arrSeq[k];

        //V3: milestone lần (k+1) chưa Completed
        if(!objSeq.completed){
            throwError(`Milestone lần ${k + 1} (${objSeq.percent}%) chưa được đánh dấu Completed trên Billing Schedule ${objSO.bsRec.getValue("name")}.`);
        }

        //V4: tối đa 1 milestone Completed chưa xuất INV
        let unbilled = countCompleted(arrSeq) - calcBilledMilestone(arrSeq, k);
        if(unbilled > 1){
            throwError(`Có ${unbilled} milestone đã Completed nhưng chưa xuất hóa đơn. Mỗi Invoice chỉ xuất cho 1 milestone. Vui lòng bỏ tick Completed các milestone sau milestone lần ${k + 1} rồi tạo lại Invoice.`);
        }

        let jobPrice = (search.lookupFields({type: "job", id: objSO.jobId, columns: ["jobprice"]}).jobprice ?? 0) * 1;
        let currencyId = _invRec.getValue("currency");

        let quantity = 1;
        let amount = 0;
        if(k + 1 < n){
            amount = constFormat.roundCurrency(currencyId, jobPrice * objSeq.percent / 100);
        }
        else{
            //INV lần cuối: dồn chênh lệch làm tròn để tổng INV = jobprice
            amount = constFormat.roundCurrency(currencyId, jobPrice - objBilled.totalAmount);
        }

        return {
            billingProgress: objSeq.percent,
            quantity: quantity,
            rate: constFormat.roundNumber(amount / quantity, 8),
            amount: amount,
            arrFromJobLine: objSO.arrFromJobLine,
        };
    }

    /**
     * Action 2 - beforeSubmit create: tính & set Billing Progress, Quantity, Rate, Amount (chạy cả khi Invoice Sales Orders / Billing queue / CSV)
     * @param {Record} _invRec : newRecord của Invoice
     */
    const updateInvoiceBilling = (_invRec) => {
        let objBilling = calcInvoiceBilling(_invRec);
        if(!objBilling) return;
        
        let sizeItemSublist = _invRec.getLineCount("item");

        for(let i = 0; i < sizeItemSublist; i++){
            //Billing Line: line INV tương ứng line SO {orderline} kế thừa từ Project ({fromjob} = T)
            let orderLine = _invRec.getSublistValue({sublistId: "item", fieldId: "orderline", line: i});
            if(!objBilling.arrFromJobLine.includes(orderLine?.toString())) continue;

            lbf.setSublistValueData(_invRec, "item", [
                "custcol_scv_billing_progress", "quantity", "rate", "amount",
            ], i, [
                objBilling.billingProgress, objBilling.quantity, objBilling.rate, objBilling.amount,
            ]);
        }
    }

    /**
     * Action 2 - beforeLoad create trên UI: điền sẵn giá trị để user thấy trước khi Save. Lỗi V2 - V4 sẽ báo khi Save (beforeSubmit)
     * @param {Object} _scriptContext : scriptContext của beforeLoad
     */
    const prefillInvoiceBilling = (_scriptContext) => {
        if(_scriptContext.type !== "create") return;

        try{
            updateInvoiceBilling(_scriptContext.newRecord);
        }
        catch(err){
            //Lỗi nghiệp vụ V2 - V4 sẽ báo lại khi Save -> không log để tránh cảnh báo nhầm
            if(err?.name !== "SCV_BILLING_MILESTONE"){
                log.error("Error: try.catch.prefillInvoiceBilling", err?.message ?? err);
            }
        }
    }

    /**
     * Action 2 - 2.1 B6, V5: Edit INV giữ nguyên Billing Progress / Quantity / Rate / Amount cũ, bị thay đổi (CSV / script khác) -> chặn
     * @param {Record} _newRec
     * @param {Record} _oldRec
     */
    const validateEditInvoice = (_newRec, _oldRec) => {
        if(!_oldRec) return;

        let sizeOld = _oldRec.getLineCount("item");
        let arrOldLine = [];
        for(let i = 0; i < sizeOld; i++){
            //Chỉ validate Billing Line (line đã được set Billing Progress lúc create), line khác user thao tác bình thường
            let billingProgress = _oldRec.getSublistValue({sublistId: "item", fieldId: "custcol_scv_billing_progress", line: i});
            if(billingProgress === "" || billingProgress === null) continue;

            arrOldLine.push({
                line: _oldRec.getSublistValue({sublistId: "item", fieldId: "line", line: i}),
                values: ["custcol_scv_billing_progress", "quantity", "rate", "amount"].map(fieldId => _oldRec.getSublistValue({sublistId: "item", fieldId: fieldId, line: i}) * 1),
            });
        }
        //INV không theo Billing Schedule milestone
        if(arrOldLine.length === 0) return;

        let sizeNew = _newRec.getLineCount("item");
        let arrNewLine = [];
        for(let i = 0; i < sizeNew; i++){
            arrNewLine.push({
                line: _newRec.getSublistValue({sublistId: "item", fieldId: "line", line: i}),
                values: ["custcol_scv_billing_progress", "quantity", "rate", "amount"].map(fieldId => _newRec.getSublistValue({sublistId: "item", fieldId: fieldId, line: i}) * 1),
            });
        }

        let isChanged = arrOldLine.some(objOld => {
            let objNew = arrNewLine.find(e => e.line == objOld.line);
            if(!objNew) return true;

            return objOld.values.some((val, idx) => constFormat.roundNumber(val, 8) !== constFormat.roundNumber(objNew.values[idx], 8));
        });

        if(isChanged){
            throwError(`Không được sửa Billing Progress / Quantity / Rate / Amount trên Invoice theo Billing Schedule. Muốn điều chỉnh: Void Invoice và tạo lại.`);
        }
    }

    /**
     * Action 3 - Table 3: Kiểm soát tick Completed trên Billing Schedule (R1 - R5)
     * Lưu ý: milestone link Project Task được NetSuite tự tick Completed có thể không qua script này -> V4 trên INV là chốt chặn cuối
     * @param {Record} _newRec : newRecord của Billing Schedule
     * @param {Record} _oldRec : oldRecord (edit)
     */
    const validateBillingSchedule = (_newRec, _oldRec) => {
        if(!isMilestoneSchedule(_newRec)) return;

        let soId = _newRec.getValue("transaction");
        if(!soId) return;

        let arrSeq = getBillingSequence(_newRec);
        let arrMilestone = arrSeq.filter(e => !e.isInitial);

        /**
         * C = số line milestone Completed = T (sau khi save); 
         * k = số INV đã tạo từ SO (như 2.1 B4); 
         * B = số milestone đã xuất INV = k − 1 nếu Initial Amount > 0 và k ≥ 1, ngược lại B = k.
         */
        let k = getBilledInvoices(soId).k;
        let B = calcBilledMilestone(arrSeq, k);
        let C = countCompleted(arrSeq);

        if(!!_oldRec){
            //R5: không sửa Initial Amount khi đã xuất INV
            if(k >= 1 && constFormat.parsePercent(_oldRec.getValue("initialamount")) !== constFormat.parsePercent(_newRec.getValue("initialamount"))){
                throwError(`Milestone đã xuất hóa đơn, không được sửa % / xóa line.`);
            }

            //R5: không sửa Amount (%) / xóa line milestone đã xuất INV
            let arrOldMilestone = getBillingSequence(_oldRec).filter(e => !e.isInitial);
            let isChangedBilled = arrMilestone.length < Math.min(B, arrOldMilestone.length)
                || arrOldMilestone.slice(0, B).some((objOld, idx) => objOld.percent !== arrMilestone[idx]?.percent);
            if(isChangedBilled){
                throwError(`Milestone đã xuất hóa đơn, không được sửa % / xóa line.`);
            }
        }

        //R4: không bỏ tick Completed line đã xuất INV
        let objUncheckBilled = arrMilestone.slice(0, B).find(e => !e.completed);
        if(!!objUncheckBilled){
            throwError(`Milestone lần ${objUncheckBilled.lineNum} đã xuất hóa đơn, không thể bỏ Completed.`);
        }

        //R1: tick theo thứ tự line
        for(let i = 1; i < arrMilestone.length; i++){
            if(!arrMilestone[i].completed) continue;

            let objPrevUncheck = arrMilestone.slice(0, i).find(e => !e.completed);
            if(!!objPrevUncheck){
                throwError(`Phải hoàn thành milestone theo thứ tự. Milestone lần ${objPrevUncheck.lineNum} chưa Completed.`);
            }
        }

        //R3: chưa xuất INV Initial Amount thì chưa được Completed milestone
        if(arrSeq[0]?.isInitial && k === 0 && C > 0){
            throwError(`Chưa xuất Invoice cho Initial Amount. Vui lòng xuất Invoice Initial Amount trước khi Completed milestone.`);
        }

        //R2: tối đa 1 milestone Completed chưa xuất INV
        if(C - B > 1){
            throwError(`Milestone lần ${B + 1} đã Completed nhưng chưa xuất hóa đơn. Vui lòng xuất Invoice cho milestone này trước khi Completed milestone tiếp theo.`);
        }
    }

    return {
        prefillInvoiceBilling,
        updateInvoiceBilling,
        validateEditInvoice,

        validateBillingSchedule,
    };

});
