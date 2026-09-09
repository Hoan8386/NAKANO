/**
 * Nội dung: Sinh mã Project Code (entityid) theo Type of Job & Classification
 * Quy tắc:
 *  TH1: Big Job / Original                     -> XXYYYY00 (XX: 2 số cuối năm Start date, YYYY: 0001-0499 reset theo năm)
 *  TH2: Big Job / Additional (parent là TH1)   -> XXYYYYZZ (XXYYYY: lấy từ mã cha, ZZ: 01-69 theo từng cha)
 *  TH3: Big Job / PC Sum     (parent là TH1)   -> XXYYYYZZ (XXYYYY: lấy từ mã cha, ZZ: 70-99 theo từng cha)
 *  TH4: Minor Job / All                        -> XXYYYYZZ (YYYY: Customer Code 0500-9999 theo năm, ZZ: 01-99 theo Customer trong năm)
 * =======================================================================================
 *  Date                Author                  Description
 *  24 Aug 2026         Huy Pham                Init, create file. Sinh mã Project Code, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d444yau)
 */
define(['N/search', 'N/error', 'N/format',
    '../cons/scv_cons_seqnumber.js',
    '../cons/scv_cons_project_typeofjob.js',
    '../cons/scv_cons_project_classification.js',
],(search, error, format,
    constSeqNumber,
    constProjectTypeOfJob,
    constProjectClassification,
) => {

    const TypeOfJob = constProjectTypeOfJob.Records;

    const Classification = constProjectClassification.Records;

    const SeqType = {
        ORIGINAL: "PROJECT_ORIGINAL",
        ADDITIONAL: "PROJECT_ADDITIONAL",
        PCSUM: "PROJECT_PCSUM",
        MINOR_CUSTCODE: "PROJECT_MINOR_CUSTCODE",
        MINOR: "PROJECT_MINOR",
    };

    //Số khởi tạo & số cuối dải của từng bộ đếm: số đầu tiên được cấp = INIT + 1
    const SeqRange = {
        [SeqType.ORIGINAL]:        {init: 0,   max: 499},
        [SeqType.ADDITIONAL]:      {init: 0,   max: 69},
        [SeqType.PCSUM]:           {init: 69,  max: 99},
        [SeqType.MINOR_CUSTCODE]:  {init: 499, max: 9999},
        [SeqType.MINOR]:           {init: 0,   max: 99},
    };

    //Các field trigger sinh mã: khi edit chỉ chạy lại validation/sinh mã nếu user thay đổi 1 trong các field này
    const GenTriggerFields = ['custentity_scv_project_type_of_job', 'custentity_scv_project_classification', 'parent', 'startdate'];

    //Placeholder NetSuite điền vào entityid khi bật auto-numbering (lúc create chưa có số thật)
    const AutoNamePlaceholder = "To Be Generated";

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

    //XX: 2 ký tự cuối của số năm Start date, VD 5/10/2026 -> "26"
    const getYearPrefix = (_startDate) => {
        let dateObj = _startDate instanceof Date ? _startDate : format.parse({value: _startDate, type: format.Type.DATE});

        return dateObj.getFullYear().toString().slice(-2);
    }

    //ST1-B1: tìm bản ghi Project (record type job) có internalid = _parentId. Có kết quả -> parent là Project, không -> parent là Customer
    const getParentProject = (_parentId) => {
        let arrResult = search.create({
            type: search.Type.JOB,
            filters: [
                ["internalid", "anyof", _parentId]
            ],
            columns: ["entityid", "custentity_scv_project_type_of_job", "custentity_scv_project_classification", "customer"]
        }).run().getRange({start: 0, end: 1});

        if(arrResult.length == 0) return null;

        return {
            internalid: _parentId,
            entityid: arrResult[0].getValue("entityid") || "",
            typeOfJob: arrResult[0].getValue("custentity_scv_project_type_of_job"),
            classification: arrResult[0].getValue("custentity_scv_project_classification"),
            parent: arrResult[0].getValue("customer"),
        };
    }

    //Lấy số tiếp theo của bộ đếm theo Type + Prefix; chưa có record thì tạo mới, quá dải thì báo lỗi
    const getNextSeqNumber = (_seqType, _prefix, _objExtraValues, _errOutOfRange) => {
        let range = SeqRange[_seqType];

        let arrSeqNumber = constSeqNumber.getDataSourceWithFilters({
            custrecord_scv_rcn_type: _seqType,
            custrecord_scv_rcn_prefix: _prefix
        });

        let curSeqNumber;
        if(arrSeqNumber.length > 0){
            curSeqNumber = arrSeqNumber[0].custrecord_scv_rcn_currentnumber * 1 + 1;

            if(curSeqNumber > range.max) throwError(_errOutOfRange);

            constSeqNumber.updateCurrentNumber(arrSeqNumber[0].internalid, curSeqNumber);
        }
        else{
            curSeqNumber = range.init + 1;

            let mapFieldValues = Object.assign({
                name: `${_seqType}-${_prefix}`.toUpperCase(),
                custrecord_scv_rcn_type: _seqType,
                custrecord_scv_rcn_prefix: _prefix,
                custrecord_scv_rcn_currentnumber: curSeqNumber,
            }, _objExtraValues || {});

            constSeqNumber.createSequence(mapFieldValues);
        }

        return {curSeqNumber, arrSeqNumber};
    }

    //ST1: Kiểm tra hợp lệ dữ liệu đầu vào, trả về parentProject (null nếu parent là Customer)
    const validateProject = (_projectRec, _typeOfJob, _classification) => {
        let parentId = _projectRec.getValue('parent');
        let startDate = _projectRec.getValue('startdate');

        //No1: parent bắt buộc nhập
        if(!parentId) throwError("Vui lòng chọn Customer / Project cha");

        let parentProject = getParentProject(parentId);

        let isChildCase = (_typeOfJob == TypeOfJob.BigJob.ID && [Classification.Additional.ID, Classification.PCSum.ID].includes(_classification));

        if(!isChildCase){
            //No2 - TH1/TH4: parent phải là Customer
            if(!!parentProject) throwError("TH này phải gắn trực tiếp vào Customer");

            //No3 - TH1/TH4: Start date bắt buộc nhập
            if(!startDate) throwError("Vui lòng nhập Start date");
        }
        else{
            //No4 - TH2/TH3: parent phải là Project cha
            if(!parentProject) throwError("Additional / PC Sum phải chọn Project cha");

            //No5 - TH2/TH3: Project cha phải là Big Job / Original (TH1)
            if(parentProject.typeOfJob != TypeOfJob.BigJob.ID || parentProject.classification != Classification.Original.ID){
                throwError("Project cha phải là Big Job / Original (TH1)");
            }

            //No6 - TH2/TH3: parent của Project cha phải là Customer - chặn Project cấp 3
            if(!!parentProject.parent && !!getParentProject(parentProject.parent)){
                throwError("Không hỗ trợ Project cấp 3");
            }

            //No7 - TH2/TH3: Project cha phải có Job ID (đủ 6 ký tự XXYYYY)
            if(parentProject.entityid.length < 6) throwError("Project cha chưa được sinh mã Project Code");
        }

        return parentProject;
    }

    //TH1: Big Job / Original -> XXYYYY00
    const genCodeOriginal = (_projectRec) => {
        let yearPrefix = getYearPrefix(_projectRec.getValue('startdate'));

        let {curSeqNumber} = getNextSeqNumber(SeqType.ORIGINAL, yearPrefix, {
            custrecord_scv_rcn_subsidiary: _projectRec.getValue('subsidiary'),
            custrecord_scv_rcn_yearmonth: `20${yearPrefix}`,
        }, `Đã hết dải Project Original của năm ${yearPrefix}`);

        return yearPrefix + curSeqNumber.toString().padStart(4, '0') + "00";
    }

    //TH2/TH3: Big Job / Additional | PC Sum -> XXYYYYZZ (XXYYYY: 6 ký tự đầu mã cha)
    const genCodeChild = (_projectRec, _parentProject, _classification) => {
        let parentCode = _parentProject.entityid.substring(0, 6);

        let isPcSum = _classification == Classification.PCSum.ID;
        let seqType = isPcSum ? SeqType.PCSUM : SeqType.ADDITIONAL;

        let {curSeqNumber} = getNextSeqNumber(seqType, parentCode, {
            custrecord_scv_rcn_subsidiary: _projectRec.getValue('subsidiary'),
            custrecord_scv_rcn_yearmonth: `20${parentCode.substring(0, 2)}`,
        }, isPcSum ? "Đã hết dải PC Sum" : "Đã hết dải Additional");

        return parentCode + curSeqNumber.toString().padStart(2, '0');
    }

    //TH4: Minor Job / All -> XXYYYYZZ (YYYY: Customer Code trong năm, ZZ: số Job của Customer trong năm)
    const genCodeMinor = (_projectRec) => {
        let yearPrefix = getYearPrefix(_projectRec.getValue('startdate'));
        let customerId = _projectRec.getValue('parent');
        let subsidiaryId = _projectRec.getValue('subsidiary');

        let minorPrefix = `${yearPrefix}-${customerId}`;

        let customerCode, jobNumber;

        let arrMinorSeq = constSeqNumber.getDataSourceWithFilters({
            custrecord_scv_rcn_type: SeqType.MINOR,
            custrecord_scv_rcn_prefix: minorPrefix
        });
        if(arrMinorSeq.length > 0){
            //Customer đã có Customer Code YYYY trong năm -> chỉ tăng số Job ZZ
            customerCode = arrMinorSeq[0].custrecord_scv_rcn_customertnumber;

            jobNumber = arrMinorSeq[0].custrecord_scv_rcn_currentnumber * 1 + 1;

            if(jobNumber > SeqRange[SeqType.MINOR].max) throwError(`Đã hết dải Job của Customer trong năm ${yearPrefix}`);

            constSeqNumber.updateCurrentNumber(arrMinorSeq[0].internalid, jobNumber);
        }
        else{
            //Cấp Customer Code YYYY mới trong năm từ bộ đếm PROJECT_MINOR_CUSTCODE (Prefix = XX)
            let {curSeqNumber} = getNextSeqNumber(SeqType.MINOR_CUSTCODE, yearPrefix, {
                custrecord_scv_rcn_subsidiary: subsidiaryId,
                custrecord_scv_rcn_yearmonth: `20${yearPrefix}`,
            }, `Đã hết dải Customer Code của năm ${yearPrefix}`);

            customerCode = curSeqNumber.toString().padStart(4, '0');

            jobNumber = 1;

            constSeqNumber.createSequence({
                name: `${SeqType.MINOR}-${minorPrefix}`.toUpperCase(),
                custrecord_scv_rcn_subsidiary: subsidiaryId,
                custrecord_scv_rcn_type: SeqType.MINOR,
                custrecord_scv_rcn_prefix: minorPrefix,
                custrecord_scv_rcn_yearmonth: `20${yearPrefix}`,
                custrecord_scv_rcn_currentnumber: jobNumber,
                custrecord_scv_rcn_customertnumber: customerCode,
            });
        }

        return yearPrefix + customerCode + jobNumber.toString().padStart(2, '0');
    }

    const genProjectCode = (_projectRec, _triggerType) => {
        //Make copy: reset entityid để sinh mã mới
        if(_triggerType == "copy") _projectRec.setValue('entityid', '');

        //Chỉ sinh mã khi entityid đang trống / là placeholder auto-numbering; Project đã có mã thì không sinh lại
        let entityidOld = _projectRec.getValue('entityid') || "";
        if(!!entityidOld && entityidOld != AutoNamePlaceholder) return entityidOld;

        //Ép kiểu number để so sánh với ID trong file enum (getValue trả về string)
        let typeOfJobId = _projectRec.getValue('custentity_scv_project_type_of_job') * 1;
        let classificationId = _projectRec.getValue('custentity_scv_project_classification') * 1;

        //Điều kiện chung: Type of Job & Classification khác NULL
        if(!typeOfJobId || !classificationId) return "";

        //Xác định TH; tổ hợp ngoài 04 TH thì không sinh mã
        let actionCase = "";
        if(typeOfJobId == TypeOfJob.BigJob.ID && classificationId == Classification.Original.ID){
            actionCase = "TH1";
        }
        else if(typeOfJobId == TypeOfJob.BigJob.ID && [Classification.Additional.ID, Classification.PCSum.ID].includes(classificationId)){
            actionCase = "TH2TH3";
        }
        else if(typeOfJobId == TypeOfJob.MinorJob.ID && classificationId == Classification.All.ID){
            actionCase = "TH4";
        }
        
        if(!actionCase) return "";

        let parentProject = validateProject(_projectRec, typeOfJobId, classificationId);

        let entityid = "";
        switch(actionCase){
            case "TH1":
                entityid = genCodeOriginal(_projectRec);
            break;
            case "TH2TH3":
                entityid = genCodeChild(_projectRec, parentProject, classificationId);
            break;
            case "TH4":
                entityid = genCodeMinor(_projectRec);
            break;
        }
        
        //Tắt auto-numbering để NetSuite nhận entityid set thủ công
        _projectRec.setValue('autoname', false);
        _projectRec.setValue('entityid', entityid);

        return entityid;
    }

    return {
        isGenFieldsChanged,
        genProjectCode,
    };

});
