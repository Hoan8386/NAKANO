/**
 * Nội dung: Sinh mã Project Code (entityid) theo Type of Job & Classification & Subsidiary
 * Cấu trúc mã: AA_ + XX + YYYY + ZZ (11 ký tự)
 *  AA_ : Subsidiary Prefix {subsidiary.custrecord_scv_sub_prefix} + "_"
 *  XX  : 2 ký tự cuối của NĂM TÀI CHÍNH chứa Start date (năm tài chính 01/04 - 31/03)
 * Bảng Phân loại chứng từ (mục 3.1.c):
 *  TH1 - Big Job / Original      - mọi sub  -> AA_XXYYYY00 (YYYY 0001-0499; NKN TH 0007-0499)
 *  TH2 - Big Job / Additional    - mọi sub  -> <mã cha bỏ 2 ký tự cuối> + ZZ (01-69)
 *  TH3 - Big Job / PC Sum        - mọi sub  -> <mã cha bỏ 2 ký tự cuối> + ZZ (70-99)
 *  TH4.1/2/7 - Minor / All       - MY,VN,ID,SG -> AA_XXYYYYZZ (YYYY: Customer Code 0500-9999, SG 0503-9999; ZZ 01-99, ID 01-98)
 *  TH4.3 - Minor / Reserve Indirect Cost - ID -> AA_XXYYYY99 (ZZ cố định 99, tối đa 01 mã/Customer/năm)
 *  TH4.4 - Minor / All           - TH       -> AA_XXYYYY00 (YYYY 0500-9999 đếm theo TỪNG JOB của sub)
 *  TH4.5 - Minor / Indirect Cost No - SG    -> AA_XX0501ZZ (ZZ 01-10, dùng chung toàn sub)
 *  TH4.6 - Minor / Store job no  - SG       -> AA_XX0502ZZ (ZZ 01-05, dùng chung toàn sub)
 * =======================================================================================
 *  Date                Author                  Description
 *  24 Aug 2026         Huy Pham                Init, create file. Sinh mã Project Code, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d444yau)
 *  22 Sep 2026         Huy Pham                Điều chỉnh sinh mã Project Code độc lập, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d444yau?comment=1300230000032342)
 *  23 Sep 2026         Huy Pham                Fix Make copy Project không sinh mã mới, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d444yau)
 */
define(['N/search', 'N/error', 'N/format', 'N/ui/serverWidget',
    '../cons/scv_cons_seqnumber.js',
    '../cons/scv_cons_project_typeofjob.js',
    '../cons/scv_cons_project_classification.js',
    '../cons/scv_cons_subsidiary.js',
],(search, error, format, serverWidget,
    constSeqNumber,
    constProjectTypeOfJob,
    constProjectClassification,
    constSubsidiary,
) => {

    const TypeOfJob = constProjectTypeOfJob.Records;

    const Classification = constProjectClassification.Records;

    const Subsidiary = constSubsidiary.Records;

    //Type_Symbol - khoá so khớp {custrecord_scv_rcn_type} trên record Sequence number
    const SeqType = {
        ORIGINAL: "PROJECT_ORIGINAL",
        ADDITIONAL: "PROJECT_ADDITIONAL",
        PCSUM: "PROJECT_PCSUM",
        MINOR_CUSTCODE: "PROJECT_MINOR_CUSTCODE",
        MINOR: "PROJECT_MINOR",
        MINOR_JOBSEQ: "PROJECT_MINOR_JOBSEQ",
        MINOR_IDC: "PROJECT_MINOR_IDC",
        MINOR_STORE: "PROJECT_MINOR_STORE",
    };

    //Các TH sinh mã theo Bảng Phân loại chứng từ
    const ProjectCase = {
        ORIGINAL: "TH1",            //Big Job / Original
        ADDITIONAL: "TH2",          //Big Job / Additional
        PCSUM: "TH3",               //Big Job / PC Sum
        MINOR: "TH4_1",             //Minor / All - MY, VN, ID, SG (Customer Code + số Job theo Customer)
        RESERVE: "TH4_3",           //Minor / Reserve Indirect Cost - ID
        MINOR_JOBSEQ: "TH4_4",      //Minor / All - TH (đếm theo từng Job của sub)
        MINOR_IDC: "TH4_5",         //Minor / Indirect Cost No - SG
        MINOR_STORE: "TH4_6",       //Minor / Store job no - SG
    };

    //init: giá trị khởi tạo Current Number (số đầu dải = init + 1); max: số cuối dải. bySubsidiary: dải riêng của công ty con
    const SeqRange = {
        [SeqType.ORIGINAL]:        {init: 0,   max: 499,  bySubsidiary: {[Subsidiary.NknTh.ID]: {init: 6,   max: 499}}},
        [SeqType.ADDITIONAL]:      {init: 0,   max: 69},
        [SeqType.PCSUM]:           {init: 69,  max: 99},
        [SeqType.MINOR_CUSTCODE]:  {init: 499, max: 9999, bySubsidiary: {[Subsidiary.NknSg.ID]: {init: 502, max: 9999}}},
        [SeqType.MINOR]:           {init: 0,   max: 99,   bySubsidiary: {[Subsidiary.NknId.ID]: {init: 0,   max: 98}}},
        [SeqType.MINOR_JOBSEQ]:    {init: 499, max: 9999},
        [SeqType.MINOR_IDC]:       {init: 0,   max: 10},
        [SeqType.MINOR_STORE]:     {init: 0,   max: 5},
    };

    //YYYY cố định của TH4 Case 5 / 6
    const FixedCustomerCode = {
        [ProjectCase.MINOR_IDC]: "0501",
        [ProjectCase.MINOR_STORE]: "0502",
    };

    //Năm tài chính bắt đầu 01/04: Start date tháng >= 4 lấy chính năm đó, tháng <= 3 lấy năm trước
    const FiscalYearStartMonth = 4;

    //Độ dài phần số sau AA_ : XX(2) + YYYY(4) + ZZ(2)
    const CodeNumberLength = 8;

    //Số lần đọc lại & cấp lại số khi phát hiện tranh chấp trên cùng 1 bộ đếm
    const MaxRetrySeq = 5;

    //Các field trigger sinh mã / kiểm tra lại: khi edit chỉ chạy nếu user thay đổi 1 trong các field này
    const GenTriggerFields = ['custentity_scv_project_type_of_job', 'custentity_scv_project_classification',
        'parent', 'startdate', 'subsidiary', 'entityid'];

    //Placeholder NetSuite điền vào entityid khi bật auto-numbering (lúc create chưa có số thật)
    const AutoNamePlaceholder = "To Be Generated";

    //Lỗi NetSuite báo khi record bộ đếm đã bị user khác ghi đè -> đọc lại & thử lại
    const ConcurrencyErrors = ["RCRD_HAS_BEEN_CHANGED", "SSS_RECORD_LOCKED"];

    const toCompareValue = (_value) => _value instanceof Date ? _value.getTime() : (_value ?? "");

    const isGenFieldsChanged = (_oldRec, _newRec) => {
        if(!_oldRec) return true;

        return GenTriggerFields.some(fieldId => {
            return String(toCompareValue(_oldRec.getValue(fieldId))) != String(toCompareValue(_newRec.getValue(fieldId)));
        });
    }

    const throwError = (_message) => {
        throw error.create({
            name: "SCV_PROJECT_CODE",
            message: _message,
            notifyOff: true
        });
    }

    const isConcurrencyError = (_err) => ConcurrencyErrors.includes(_err?.name || "");

    const padNumber = (_number, _length) => (_number * 1).toString().padStart(_length, '0');

    const getListName = (_records, _id) => Object.values(_records).find(_rec => _rec.ID == _id)?.NAME || _id;

    //Search trên entity trả về tên kèm cấp cha ("Customer A : VN_26000101") -> chỉ lấy phần của chính record
    const stripHierarchy = (_value) => (_value || "").split(":").pop().trim();

    //XX: 2 ký tự cuối của NĂM TÀI CHÍNH chứa Start date. VD 05/10/2026 -> FY26 -> "26"; 12/01/2027 -> FY26 -> "26"
    const getFiscalYearPrefix = (_startDate) => {
        if(!_startDate) return "";

        let dateObj = _startDate instanceof Date ? _startDate : format.parse({value: _startDate, type: format.Type.DATE});

        let fiscalYear = (dateObj.getMonth() + 1) >= FiscalYearStartMonth ? dateObj.getFullYear() : dateObj.getFullYear() - 1;

        return fiscalYear.toString().slice(-2);
    }

    //Dải của bộ đếm theo Type_Symbol + Subsidiary
    const getSeqRange = (_seqType, _subsidiaryId) => {
        let range = SeqRange[_seqType];

        return range.bySubsidiary?.[_subsidiaryId] || {init: range.init, max: range.max};
    }

    //Dải hợp lệ của 1 đoạn số trên Project Code: số đầu dải = init + 1
    const toSegmentRange = (_seqType, _subsidiaryId) => {
        let range = getSeqRange(_seqType, _subsidiaryId);

        return {min: range.init + 1, max: range.max};
    }

    //ST1-9: AA_ lấy từ Subsidiary Prefix, áp dụng cho TẤT CẢ công ty con (kể cả NKN TH)
    const getSubsidiaryInfo = (_subsidiaryId) => {
        if(!_subsidiaryId) return {name: "", prefix: ""};

        let subLKF = search.lookupFields({
            type: search.Type.SUBSIDIARY, id: _subsidiaryId,
            columns: ["name", "custrecord_scv_sub_prefix"]
        });

        return {
            name: subLKF.name || "",
            prefix: (subLKF.custrecord_scv_sub_prefix || "").trim(),
        };
    }

    //ST1-B1: tìm bản ghi Project (record type job) có internalid = _parentId. Có kết quả -> parent là Project cha, không -> parent là Customer
    const getParentProject = (_parentId) => {
        if(!_parentId) return null;

        let arrResult = search.create({
            type: search.Type.JOB,
            filters: [
                ["internalid", "anyof", _parentId]
            ],
            columns: ["entityid", "subsidiary", "customer",
                "custentity_scv_project_type_of_job", "custentity_scv_project_classification"]
        }).run().getRange({start: 0, end: 1});

        if(arrResult.length == 0) return null;

        return {
            internalid: _parentId,
            entityid: stripHierarchy(arrResult[0].getValue("entityid")),
            subsidiary: arrResult[0].getValue("subsidiary") * 1,
            parent: arrResult[0].getValue("customer"),
            typeOfJob: arrResult[0].getValue("custentity_scv_project_type_of_job"),
            classification: arrResult[0].getValue("custentity_scv_project_classification"),
        };
    }

    //ST2: tìm record Sequence number theo khoá so khớp Subsidiary + Type + Prefix (Inactive = No)
    const findSeqRecords = (_seqType, _subsidiaryId, _prefix) => {
        let arrSeqNumber = constSeqNumber.getDataSourceWithFilters({
            custrecord_scv_rcn_subsidiary: _subsidiaryId,
            custrecord_scv_rcn_type: _seqType,
            custrecord_scv_rcn_prefix: _prefix
        });

        //Tranh chấp lúc tạo có thể sinh ra nhiều record cùng khoá -> luôn dùng record tạo trước (internalid nhỏ nhất)
        return arrSeqNumber.sort((_a, _b) => _a.internalid * 1 - _b.internalid * 1);
    }

    const findSeqRecord = (_seqType, _subsidiaryId, _prefix) => findSeqRecords(_seqType, _subsidiaryId, _prefix)[0] || null;

    //ST3: tạo record Sequence number
    const createSeqRecord = (_options) => {
        let mapFieldValues = {
            name: `${_options.seqType} - ${_options.subsidiaryName} - ${_options.prefix}`,
            custrecord_scv_rcn_subsidiary: _options.subsidiaryId,
            custrecord_scv_rcn_type: _options.seqType,
            custrecord_scv_rcn_prefix: _options.prefix,
            custrecord_scv_rcn_yearmonth: `FY20${_options.yearPrefix}`,
            custrecord_scv_rcn_accountnumber: "",
            custrecord_scv_rcn_currentnumber: _options.currentNumber,
        };

        //Chỉ record PROJECT_MINOR mới lưu Customer Code đã cấp cho Customer trong năm
        if(_options.customerNumber != undefined) mapFieldValues.custrecord_scv_rcn_customertnumber = _options.customerNumber;

        return constSeqNumber.createSequence(mapFieldValues);
    }

    /**
     * ST2 + ST3 + chống tranh chấp: đọc - tăng - ghi Current Number trong 1 vòng retry.
     * @returns {object} {number, seqRecordId, isNewRecord}
     */
    const allocNextNumber = (_options) => {
        let range = getSeqRange(_options.seqType, _options.subsidiaryId);

        for(let attempt = 1; attempt <= MaxRetrySeq; attempt++){
            let arrSeqRecord = findSeqRecords(_options.seqType, _options.subsidiaryId, _options.prefix);

            //ST3: chưa có bộ đếm -> tạo mới với số đầu dải
            if(arrSeqRecord.length == 0){
                let firstNumber = range.init + 1;

                if(firstNumber > range.max) throwError(_options.errOutOfRange);

                let seqRecordId = createSeqRecord(Object.assign({currentNumber: firstNumber}, _options));

                //2 user cùng tạo bộ đếm: chỉ giữ record tạo trước, record thua cuộc bị inactive & cấp lại số từ record thắng
                let arrSeqRecordAfter = findSeqRecords(_options.seqType, _options.subsidiaryId, _options.prefix);
                if(arrSeqRecordAfter.length > 1 && arrSeqRecordAfter[0].internalid != seqRecordId){
                    constSeqNumber.setInactive(seqRecordId);

                    continue;
                }

                return {number: firstNumber, seqRecordId, isNewRecord: true};
            }

            let seqRecordId = arrSeqRecord[0].internalid;
            let nextNumber = 0;

            try{
                //load - set - save: NetSuite throw RCRD_HAS_BEEN_CHANGED nếu user khác vừa cấp số trên cùng bộ đếm
                constSeqNumber.updateWithLock(seqRecordId, (_curNumber) => {
                    nextNumber = _curNumber + 1;

                    if(nextNumber > range.max) throwError(_options.errOutOfRange);

                    return {custrecord_scv_rcn_currentnumber: nextNumber};
                });

                return {number: nextNumber, seqRecordId, isNewRecord: false};
            }
            catch(err){
                if(!isConcurrencyError(err)) throw err;
            }
        }

        throwError(`Đang có nhiều user cùng tạo Project trên bộ đếm ${_options.seqType} (${_options.prefix}). Vui lòng lưu lại.`);
    }

    //ST5b: đẩy Current Number lên bằng đoạn số của mã nhập tay nếu đoạn số đó lớn hơn số hiện tại
    const pushSeqNumber = (_options) => {
        for(let attempt = 1; attempt <= MaxRetrySeq; attempt++){
            let arrSeqRecord = findSeqRecords(_options.seqType, _options.subsidiaryId, _options.prefix);

            //ST3: chưa có bộ đếm -> tạo mới với chính số của mã nhập tay
            if(arrSeqRecord.length == 0){
                let seqRecordId = createSeqRecord(Object.assign({currentNumber: _options.targetNumber}, _options));

                let arrSeqRecordAfter = findSeqRecords(_options.seqType, _options.subsidiaryId, _options.prefix);
                if(arrSeqRecordAfter.length > 1 && arrSeqRecordAfter[0].internalid != seqRecordId){
                    constSeqNumber.setInactive(seqRecordId);

                    continue;
                }

                return;
            }

            let objSeqRecord = arrSeqRecord[0];

            try{
                constSeqNumber.updateWithLock(objSeqRecord.internalid, (_curNumber) => {
                    let mapFieldValues = {};

                    //Nhỏ hơn hoặc bằng thì giữ nguyên
                    if(_options.targetNumber > _curNumber) mapFieldValues.custrecord_scv_rcn_currentnumber = _options.targetNumber;

                    if(_options.customerNumber != undefined
                        && objSeqRecord.custrecord_scv_rcn_customertnumber != _options.customerNumber){

                        mapFieldValues.custrecord_scv_rcn_customertnumber = _options.customerNumber;
                    }

                    return mapFieldValues;
                });

                return;
            }
            catch(err){
                if(!isConcurrencyError(err)) throw err;
            }
        }
    }

    //ST2-B1 + ST1-10: xác định TH theo Type of Job + Classification + Subsidiary. Trả về "" nếu tổ hợp không được hỗ trợ
    const resolveCase = (_typeOfJobId, _classificationId, _subsidiaryId) => {
        if(_typeOfJobId == TypeOfJob.BigJob.ID){
            if(_classificationId == Classification.Original.ID) return ProjectCase.ORIGINAL;
            if(_classificationId == Classification.Additional.ID) return ProjectCase.ADDITIONAL;
            if(_classificationId == Classification.PCSum.ID) return ProjectCase.PCSUM;

            return "";
        }

        if(_typeOfJobId == TypeOfJob.MinorJob.ID){
            //Minor / All: NKN TH đếm theo TỪNG JOB của công ty con, các sub còn lại đếm theo từng Customer
            if(_classificationId == Classification.All.ID){
                return _subsidiaryId == Subsidiary.NknTh.ID ? ProjectCase.MINOR_JOBSEQ : ProjectCase.MINOR;
            }

            //Reserve Indirect Cost chỉ có ở NKN ID
            if(_classificationId == Classification.ReserveIndirectCost.ID){
                return _subsidiaryId == Subsidiary.NknId.ID ? ProjectCase.RESERVE : "";
            }

            //Indirect Cost No / Store job no chỉ có ở NKN SG
            if(_classificationId == Classification.IndirectCostNo.ID){
                return _subsidiaryId == Subsidiary.NknSg.ID ? ProjectCase.MINOR_IDC : "";
            }
            if(_classificationId == Classification.StoreJobNo.ID){
                return _subsidiaryId == Subsidiary.NknSg.ID ? ProjectCase.MINOR_STORE : "";
            }
        }

        return "";
    }

    const isChildCase = (_caseKey) => [ProjectCase.ADDITIONAL, ProjectCase.PCSUM].includes(_caseKey);

    //Gom toàn bộ dữ liệu đầu vào cần cho ST1 - ST5
    const buildContext = (_projectRec, _typeOfJobId, _classificationId) => {
        let subsidiaryId = _projectRec.getValue('subsidiary') * 1;

        let objSubsidiary = getSubsidiaryInfo(subsidiaryId);

        let ctx = {
            projectId: _projectRec.id || "",
            typeOfJobId: _typeOfJobId,
            classificationId: _classificationId,
            caseKey: resolveCase(_typeOfJobId, _classificationId, subsidiaryId),
            caseDesc: `${getListName(TypeOfJob, _typeOfJobId)} / ${getListName(Classification, _classificationId)}`,
            subsidiaryId,
            subsidiaryName: objSubsidiary.name,
            subPrefixCode: objSubsidiary.prefix,
            subPrefix: !!objSubsidiary.prefix ? `${objSubsidiary.prefix}_` : "",
            parentId: _projectRec.getValue('parent'),
            startDate: _projectRec.getValue('startdate'),
            xx: "",
            parentCode: "",
            minorPrefix: "",
            //Bộ đếm của TH2 / TH3 nằm trên Subsidiary của Project cha
            seqSubsidiaryId: subsidiaryId,
        };

        ctx.parentProject = getParentProject(ctx.parentId);

        //TH2 / TH3: AA_ và XX lấy từ mã Project cha, KHÔNG tính lại theo Project con
        if(isChildCase(ctx.caseKey)){
            let parentEntityId = ctx.parentProject?.entityid || "";

            if(parentEntityId.length > CodeNumberLength - 2){
                ctx.parentCode = parentEntityId.slice(0, -2);
                ctx.subPrefix = ctx.parentCode.slice(0, -6);
                ctx.xx = ctx.parentCode.substring(ctx.parentCode.length - 6, ctx.parentCode.length - 4);
            }

            if(!!ctx.parentProject) ctx.seqSubsidiaryId = ctx.parentProject.subsidiary;

            return ctx;
        }

        ctx.xx = getFiscalYearPrefix(ctx.startDate);

        //Prefix bộ đếm PROJECT_MINOR = XX-<Customer Internal ID>
        if(!!ctx.xx && !!ctx.parentId) ctx.minorPrefix = `${ctx.xx}-${ctx.parentId}`;

        return ctx;
    }

    //ST1-B2: kiểm tra 11 điều kiện dữ liệu đầu vào (điều kiện 12 - 14 kiểm tra riêng sau khi có XX / mã nhập tay)
    const validateProject = (_ctx) => {
        //No1 - Tất cả TH: {parent} bắt buộc nhập
        if(!_ctx.parentId) throwError("Vui lòng chọn Customer / Project cha");

        //No8 - Tất cả TH: Subsidiary bắt buộc nhập
        if(!_ctx.subsidiaryId) throwError("Vui lòng chọn Subsidiary");

        //No10 - Tất cả TH: tổ hợp Type of Job + Classification + Subsidiary phải có trong Bảng Phân loại chứng từ
        if(!_ctx.caseKey){
            throwError(`Tổ hợp Type of Job / Classification / Subsidiary chưa được hỗ trợ (${_ctx.caseDesc} - ${_ctx.subsidiaryName})`);
        }

        //No9 - Tất cả TH (gồm cả NKN TH): Subsidiary Prefix phải có giá trị
        if(!_ctx.subPrefixCode) throwError(`Chưa cấu hình Subsidiary Prefix cho công ty con ${_ctx.subsidiaryName}`);

        if(isChildCase(_ctx.caseKey)){
            //No4 - TH2/TH3: {parent} phải là Project cha
            if(!_ctx.parentProject) throwError("Additional / PC Sum phải chọn Project cha");

            //No5 - TH2/TH3: Project cha phải là Big Job / Original (TH1)
            if(_ctx.parentProject.typeOfJob != TypeOfJob.BigJob.ID || _ctx.parentProject.classification != Classification.Original.ID){
                throwError("Project cha phải là Big Job / Original (TH1)");
            }

            //No6 - TH2/TH3: {parent} của Project cha phải là Customer - chặn Project cấp 3
            if(!!_ctx.parentProject.parent && !!getParentProject(_ctx.parentProject.parent)){
                throwError("Không hỗ trợ Project cấp 3");
            }

            //No7 - TH2/TH3: Project cha đã có Job ID để lấy AA_XXYYYY
            if(!_ctx.parentCode) throwError("Project cha chưa được sinh mã Project Code");

            //No11 - TH2/TH3: Subsidiary của Project con = Subsidiary của Project cha
            if(_ctx.parentProject.subsidiary != _ctx.subsidiaryId) throwError("Project con phải cùng công ty con với Project cha");

            return;
        }

        //No2 - TH1/TH4: {parent} phải là Customer
        if(!!_ctx.parentProject) throwError(`${_ctx.caseDesc} phải gắn trực tiếp vào Customer`);

        //No3 - TH1/TH4: Start date bắt buộc nhập
        if(!_ctx.startDate) throwError("Vui lòng nhập Start date");
    }

    //ST1-12: TH4 Reserve Indirect Cost - mỗi Customer tối đa 01 Project loại này trong 1 năm tài chính (ZZ cố định 99)
    const validateReserveUnique = (_ctx) => {
        if(_ctx.caseKey != ProjectCase.RESERVE) return;

        let arrFilters = [
            ["custentity_scv_project_classification", "anyof", Classification.ReserveIndirectCost.ID],
            "AND", ["customer", "anyof", _ctx.parentId],
        ];

        if(!!_ctx.projectId) arrFilters.push("AND", ["internalid", "noneof", _ctx.projectId]);

        let arrResult = search.create({
            type: search.Type.JOB,
            filters: arrFilters,
            columns: ["startdate"]
        }).run().getRange({start: 0, end: 100});

        //So theo NĂM TÀI CHÍNH của Start date thay vì tiền tố mã: bắt được cả Project chưa sinh mã
        let isExisted = arrResult.some(_objResult => getFiscalYearPrefix(_objResult.getValue("startdate")) == _ctx.xx);

        if(isExisted) throwError(`Customer đã có Project Reserve Indirect Cost của năm ${_ctx.xx}`);
    }

    //Định dạng từng đoạn YYYY / ZZ của Project Code theo TH - dùng cho ST1-14 (kiểm tra mã nhập tay) & ST5b (đẩy bộ đếm)
    const getCodeLayout = (_ctx) => {
        switch(_ctx.caseKey){
            case ProjectCase.ORIGINAL:
                return {yyyy: toSegmentRange(SeqType.ORIGINAL, _ctx.subsidiaryId), zz: {fixed: "00"}};

            case ProjectCase.ADDITIONAL:
                return {yyyy: {fixed: _ctx.parentCode.slice(-4)}, zz: toSegmentRange(SeqType.ADDITIONAL, _ctx.seqSubsidiaryId)};

            case ProjectCase.PCSUM:
                return {yyyy: {fixed: _ctx.parentCode.slice(-4)}, zz: toSegmentRange(SeqType.PCSUM, _ctx.seqSubsidiaryId)};

            case ProjectCase.MINOR:
                return {yyyy: toSegmentRange(SeqType.MINOR_CUSTCODE, _ctx.subsidiaryId), zz: toSegmentRange(SeqType.MINOR, _ctx.subsidiaryId)};

            case ProjectCase.RESERVE:
                return {yyyy: toSegmentRange(SeqType.MINOR_CUSTCODE, _ctx.subsidiaryId), zz: {fixed: "99"}};

            case ProjectCase.MINOR_JOBSEQ:
                return {yyyy: toSegmentRange(SeqType.MINOR_JOBSEQ, _ctx.subsidiaryId), zz: {fixed: "00"}};

            case ProjectCase.MINOR_IDC:
                return {yyyy: {fixed: FixedCustomerCode[ProjectCase.MINOR_IDC]}, zz: toSegmentRange(SeqType.MINOR_IDC, _ctx.subsidiaryId)};

            case ProjectCase.MINOR_STORE:
                return {yyyy: {fixed: FixedCustomerCode[ProjectCase.MINOR_STORE]}, zz: toSegmentRange(SeqType.MINOR_STORE, _ctx.subsidiaryId)};
        }

        return null;
    }

    const isSegmentValid = (_segment, _value) => {
        if(!!_segment.fixed) return _value == _segment.fixed;

        return (_value * 1) >= _segment.min && (_value * 1) <= _segment.max;
    }

    //ST5b: tách mã sẵn có thành AA_ / XX / YYYY / ZZ. isValid = false nghĩa là mã không theo dải của TH -> không đẩy bộ đếm
    const parseCode = (_ctx, _entityId) => {
        let layout = getCodeLayout(_ctx);

        let head = `${_ctx.subPrefix}${_ctx.xx}`;

        let objRes = {isValid: false, yyyy: "", zz: ""};

        if(_entityId.length != head.length + 6) return objRes;

        if(_entityId.substring(0, head.length).toUpperCase() != head.toUpperCase()) return objRes;

        let yyyy = _entityId.substring(head.length, head.length + 4);
        let zz = _entityId.substring(head.length + 4);

        if(!/^\d{4}$/.test(yyyy) || !/^\d{2}$/.test(zz)) return objRes;

        if(!isSegmentValid(layout.yyyy, yyyy) || !isSegmentValid(layout.zz, zz)) return objRes;

        objRes.isValid = true;
        objRes.yyyy = yyyy;
        objRes.zz = zz;

        return objRes;
    }

    //ST4 - TH1: Big Job / Original -> AA_XXYYYY00
    const genCodeOriginal = (_ctx) => {
        let {number} = allocNextNumber({
            seqType: SeqType.ORIGINAL,
            subsidiaryId: _ctx.subsidiaryId,
            subsidiaryName: _ctx.subsidiaryName,
            prefix: _ctx.xx,
            yearPrefix: _ctx.xx,
            errOutOfRange: `Đã hết dải Project Original của năm ${_ctx.xx} tại công ty con ${_ctx.subsidiaryName}`,
        });

        return `${_ctx.subPrefix}${_ctx.xx}${padNumber(number, 4)}00`;
    }

    //ST4 - TH2/TH3: Big Job / Additional | PC Sum -> <mã Project cha bỏ 2 ký tự cuối> + ZZ
    const genCodeChild = (_ctx) => {
        let isPcSum = _ctx.caseKey == ProjectCase.PCSUM;

        let {number} = allocNextNumber({
            seqType: isPcSum ? SeqType.PCSUM : SeqType.ADDITIONAL,
            subsidiaryId: _ctx.seqSubsidiaryId,
            subsidiaryName: _ctx.subsidiaryName,
            prefix: _ctx.parentCode,
            yearPrefix: _ctx.xx,
            errOutOfRange: isPcSum
                ? `Đã hết dải PC Sum của Project cha ${_ctx.parentProject.entityid}`
                : `Đã hết dải Additional của Project cha ${_ctx.parentProject.entityid}`,
        });

        return `${_ctx.parentCode}${padNumber(number, 2)}`;
    }

    /**
     * ST4 - TH4 B1: lấy / cấp Customer Code YYYY của Customer {parent} trong năm XX tại công ty con.
     * Chưa có thì cấp mới từ PROJECT_MINOR_CUSTCODE và tạo record PROJECT_MINOR lưu Customer Code đó.
     * @returns {object} {customerCode, minorSeq} - minorSeq = null nghĩa là Customer vừa được cấp Code mới
     */
    const getCustomerCode = (_ctx, _initJobNumber) => {
        let minorSeq = findSeqRecord(SeqType.MINOR, _ctx.subsidiaryId, _ctx.minorPrefix);

        //Customer đã có Customer Code trong năm tài chính -> dùng lại
        if(!!minorSeq) return {customerCode: minorSeq.custrecord_scv_rcn_customertnumber, minorSeq};

        let {number} = allocNextNumber({
            seqType: SeqType.MINOR_CUSTCODE,
            subsidiaryId: _ctx.subsidiaryId,
            subsidiaryName: _ctx.subsidiaryName,
            prefix: _ctx.xx,
            yearPrefix: _ctx.xx,
            errOutOfRange: `Đã hết dải Customer Code của năm ${_ctx.xx} tại công ty con ${_ctx.subsidiaryName}`,
        });

        let customerCode = padNumber(number, 4);

        createSeqRecord({
            seqType: SeqType.MINOR,
            subsidiaryId: _ctx.subsidiaryId,
            subsidiaryName: _ctx.subsidiaryName,
            prefix: _ctx.minorPrefix,
            yearPrefix: _ctx.xx,
            currentNumber: _initJobNumber,
            customerNumber: customerCode,
        });

        return {customerCode, minorSeq: null};
    }

    //ST4 - TH4 Case 1/2/7: Minor / All của MY, VN, ID, SG -> AA_XXYYYYZZ
    const genCodeMinor = (_ctx) => {
        let range = getSeqRange(SeqType.MINOR, _ctx.subsidiaryId);

        //Customer mới: record PROJECT_MINOR vừa tạo đã mang số Job đầu dải
        let {customerCode, minorSeq} = getCustomerCode(_ctx, range.init + 1);

        let jobNumber = range.init + 1;

        if(!!minorSeq){
            let objAlloc = allocNextNumber({
                seqType: SeqType.MINOR,
                subsidiaryId: _ctx.subsidiaryId,
                subsidiaryName: _ctx.subsidiaryName,
                prefix: _ctx.minorPrefix,
                yearPrefix: _ctx.xx,
                errOutOfRange: _ctx.subsidiaryId == Subsidiary.NknId.ID
                    ? `Đã hết dải Job (tối đa ${padNumber(range.max, 2)}) của Customer trong năm ${_ctx.xx} tại ${_ctx.subsidiaryName}`
                    : `Đã hết dải Job của Customer trong năm ${_ctx.xx}`,
            });

            jobNumber = objAlloc.number;
        }

        return `${_ctx.subPrefix}${_ctx.xx}${customerCode}${padNumber(jobNumber, 2)}`;
    }

    //ST4 - TH4 Case 3: Minor / Reserve Indirect Cost của NKN ID -> AA_XXYYYY99 (KHÔNG dùng & KHÔNG tăng bộ đếm ZZ)
    const genCodeReserve = (_ctx) => {
        let range = getSeqRange(SeqType.MINOR, _ctx.subsidiaryId);

        let {customerCode} = getCustomerCode(_ctx, range.init);

        return `${_ctx.subPrefix}${_ctx.xx}${customerCode}99`;
    }

    //ST4 - TH4 Case 4: Minor / All của NKN TH -> AA_XXYYYY00 (YYYY đếm theo TỪNG JOB của công ty con)
    const genCodeMinorJobSeq = (_ctx) => {
        let {number} = allocNextNumber({
            seqType: SeqType.MINOR_JOBSEQ,
            subsidiaryId: _ctx.subsidiaryId,
            subsidiaryName: _ctx.subsidiaryName,
            prefix: _ctx.xx,
            yearPrefix: _ctx.xx,
            errOutOfRange: `Đã hết dải Minor Job của năm ${_ctx.xx} tại ${_ctx.subsidiaryName}`,
        });

        return `${_ctx.subPrefix}${_ctx.xx}${padNumber(number, 4)}00`;
    }

    //ST4 - TH4 Case 5/6: Minor / Indirect Cost No | Store job no của NKN SG -> AA_XX0501ZZ | AA_XX0502ZZ
    const genCodeMinorFixed = (_ctx) => {
        let isIdc = _ctx.caseKey == ProjectCase.MINOR_IDC;

        let seqType = isIdc ? SeqType.MINOR_IDC : SeqType.MINOR_STORE;

        let range = getSeqRange(seqType, _ctx.subsidiaryId);

        let {number} = allocNextNumber({
            seqType,
            subsidiaryId: _ctx.subsidiaryId,
            subsidiaryName: _ctx.subsidiaryName,
            prefix: _ctx.xx,
            yearPrefix: _ctx.xx,
            errOutOfRange: isIdc
                ? `Đã hết dải Indirect Cost No (tối đa ${padNumber(range.max, 2)}) của năm ${_ctx.xx}`
                : `Đã hết dải Store job no (tối đa ${padNumber(range.max, 2)}) của năm ${_ctx.xx}`,
        });

        return `${_ctx.subPrefix}${_ctx.xx}${FixedCustomerCode[_ctx.caseKey]}${padNumber(number, 2)}`;
    }

    //ST4: sinh Project Code theo TH
    const genCode = (_ctx) => {
        switch(_ctx.caseKey){
            case ProjectCase.ORIGINAL:      return genCodeOriginal(_ctx);
            case ProjectCase.ADDITIONAL:
            case ProjectCase.PCSUM:         return genCodeChild(_ctx);
            case ProjectCase.MINOR:         return genCodeMinor(_ctx);
            case ProjectCase.RESERVE:       return genCodeReserve(_ctx);
            case ProjectCase.MINOR_JOBSEQ:  return genCodeMinorJobSeq(_ctx);
            case ProjectCase.MINOR_IDC:
            case ProjectCase.MINOR_STORE:   return genCodeMinorFixed(_ctx);
        }

        return "";
    }

    //ST5b: Job ID đã có sẵn (CSV import / REST / dữ liệu cũ) -> đẩy bộ đếm lên để lần sinh mã sau không trùng số
    const pushSeqFromCode = (_ctx, _objManual) => {
        let objBase = {
            subsidiaryId: _ctx.subsidiaryId,
            subsidiaryName: _ctx.subsidiaryName,
            yearPrefix: _ctx.xx,
        };

        switch(_ctx.caseKey){
            //TH1: so sánh & cập nhật theo YYYY
            case ProjectCase.ORIGINAL:
                pushSeqNumber(Object.assign({}, objBase, {
                    seqType: SeqType.ORIGINAL, prefix: _ctx.xx, targetNumber: _objManual.yyyy * 1
                }));
            break;

            //TH2 / TH3: so sánh & cập nhật theo ZZ, bộ đếm nằm trên Subsidiary của Project cha
            case ProjectCase.ADDITIONAL:
            case ProjectCase.PCSUM:
                pushSeqNumber(Object.assign({}, objBase, {
                    seqType: _ctx.caseKey == ProjectCase.PCSUM ? SeqType.PCSUM : SeqType.ADDITIONAL,
                    subsidiaryId: _ctx.seqSubsidiaryId,
                    prefix: _ctx.parentCode, targetNumber: _objManual.zz * 1
                }));
            break;

            //TH4 Case 4: so sánh & cập nhật theo YYYY
            case ProjectCase.MINOR_JOBSEQ:
                pushSeqNumber(Object.assign({}, objBase, {
                    seqType: SeqType.MINOR_JOBSEQ, prefix: _ctx.xx, targetNumber: _objManual.yyyy * 1
                }));
            break;

            //TH4 Case 5 / 6: so sánh & cập nhật theo ZZ
            case ProjectCase.MINOR_IDC:
            case ProjectCase.MINOR_STORE:
                pushSeqNumber(Object.assign({}, objBase, {
                    seqType: _ctx.caseKey == ProjectCase.MINOR_IDC ? SeqType.MINOR_IDC : SeqType.MINOR_STORE,
                    prefix: _ctx.xx, targetNumber: _objManual.zz * 1
                }));
            break;

            //TH4 Case 1 / 2 / 7 & Case 3: Customer Number + PROJECT_MINOR_CUSTCODE theo YYYY, PROJECT_MINOR theo ZZ
            case ProjectCase.MINOR:
            case ProjectCase.RESERVE:
                pushSeqNumber(Object.assign({}, objBase, {
                    seqType: SeqType.MINOR_CUSTCODE, prefix: _ctx.xx, targetNumber: _objManual.yyyy * 1
                }));

                pushSeqNumber(Object.assign({}, objBase, {
                    seqType: SeqType.MINOR, prefix: _ctx.minorPrefix,
                    //Case 3 (Reserve): ZZ cố định 99, không dùng bộ đếm ZZ -> chỉ lưu Customer Number
                    targetNumber: _ctx.caseKey == ProjectCase.RESERVE
                        ? getSeqRange(SeqType.MINOR, _ctx.subsidiaryId).init
                        : _objManual.zz * 1,
                    customerNumber: _objManual.yyyy
                }));
            break;
        }
    }

    /**
     * 3.2 Lưu ý khác: Disable field Job ID {entityid}, không cho user nhập tay - mã chỉ do hệ thống sinh
     * @param {Object} _scriptContext : scriptContext của beforeLoad
     */
    const disableFieldProjectCode = (_scriptContext) => {
        if(!["create", "copy", "edit"].includes(_scriptContext.type)) return;

        try{
            let entityidFld = _scriptContext.form.getField({id: 'entityid'});

            if(!!entityidFld) entityidFld.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
        }
        catch(err){
            //Form không có field Job ID (form rút gọn / custom form) -> bỏ qua
        }
    }

    /**
     * Make copy trên UI: xóa Job ID & Project Segment copy từ Project nguồn ngay trên form để bản ghi mới được sinh mã lại
     * @param {Object} _scriptContext : scriptContext của beforeLoad
     */
    const resetCodeOnCopy = (_scriptContext) => {
        if(_scriptContext.type != "copy") return;

        _scriptContext.newRecord.setValue('entityid', '');
        _scriptContext.newRecord.setValue('cseg_scv_sg_proj', '');
    }

    /**
     * ST1 - ST5: kiểm tra dữ liệu đầu vào và sinh mã Project Code.
     * @param {Record} _projectRec : newRecord của Project
     * @param {string} _triggerType : create / copy / edit / xedit
     * @param {Record} _oldRec : oldRecord
     * @returns {string} Job ID {entityid}
     */
    const genProjectCode = (_projectRec, _triggerType, _oldRec) => {
        //Make copy: NetSuite chỉ trả type "copy" ở beforeLoad, lúc Save bản copy beforeSubmit nhận type "create".
        //Project Segment chỉ được gán ở afterSubmit -> bản ghi MỚI mà đã có value nghĩa là copy từ Project khác
        if(["create", "copy"].includes(_triggerType) && !!_projectRec.getValue('cseg_scv_sg_proj')){
            _projectRec.setValue('entityid', '');
            _projectRec.setValue('cseg_scv_sg_proj', '');
        }

        //3.2 Lưu ý khác: Project Segment đã có value nghĩa là Project đã được cấp mã -> không sinh mã mới
        if(!!_projectRec.getValue('cseg_scv_sg_proj')){
            let entityidCur = (_projectRec.getValue('entityid') || "").trim();

            //Không tắt auto-numbering thì NetSuite ghi đè Job ID bằng số tự sinh của hệ thống
            if(!!entityidCur && entityidCur != AutoNamePlaceholder) _projectRec.setValue('autoname', false);

            return entityidCur;
        }

        //Edit: Project đã có mã thì giữ nguyên, không sinh lại.
        //Field Job ID đang disable nên form có thể không submit giá trị -> set lại theo oldRecord cho chắc
        if(["edit", "xedit"].includes(_triggerType) && !!_oldRec){
            let entityidOld = (_oldRec.getValue('entityid') || "").trim();

            if(!!entityidOld && entityidOld != AutoNamePlaceholder){
                if((_projectRec.getValue('entityid') || "").trim() != entityidOld){
                    _projectRec.setValue('autoname', false);
                    _projectRec.setValue('entityid', entityidOld);
                }

                return entityidOld;
            }
        }

        let entityid = (_projectRec.getValue('entityid') || "").trim();

        //Job ID đã có giá trị (CSV import / REST / Web Services đưa vào): BỎ QUA ST4, chỉ chạy ST5b đẩy bộ đếm
        let isExistedCode = !!entityid && entityid != AutoNamePlaceholder;

        //Ép kiểu number để so sánh với ID trong file enum (getValue trả về string)
        let typeOfJobId = _projectRec.getValue('custentity_scv_project_type_of_job') * 1;
        let classificationId = _projectRec.getValue('custentity_scv_project_classification') * 1;

        //Điều kiện chung: Type of Job & Classification khác NULL
        if(!typeOfJobId || !classificationId) return entityid;

        let ctx = buildContext(_projectRec, typeOfJobId, classificationId);

        //ST1: kiểm tra hợp lệ dữ liệu đầu vào (điều kiện 1 - 12)
        validateProject(ctx);

        validateReserveUnique(ctx);

        if(isExistedCode){
            //ST5b: đẩy Current Number lên theo mã sẵn có để lần sinh mã sau không trùng số.
            //Mã không đúng dải của TH thì bỏ qua, KHÔNG chặn lưu (ST1 điều kiện 13/14 đã bỏ theo spec)
            let objCode = parseCode(ctx, entityid);

            if(objCode.isValid) pushSeqFromCode(ctx, objCode);

            _projectRec.setValue('autoname', false);

            return entityid;
        }

        //ST2 - ST4: sinh mã
        entityid = genCode(ctx);

        //Tắt auto-numbering để NetSuite nhận entityid set thủ công
        _projectRec.setValue('autoname', false);
        _projectRec.setValue('entityid', entityid);

        return entityid;
    }

    return {
        isGenFieldsChanged,
        disableFieldProjectCode,
        resetCodeOnCopy,
        genProjectCode,
    };

});
