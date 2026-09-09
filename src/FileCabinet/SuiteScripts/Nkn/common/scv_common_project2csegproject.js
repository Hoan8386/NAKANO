/**
 * Nội dung: Tự động tạo & update Project Segment (customrecord_cseg_scv_sg_proj) khi tạo & update Project
 * Mapping: entityid -> name, entitystatus -> custrecord_scv_project_status,
 *          custentity_scv_project_completion_date -> custrecord_scv_project_completion_date,
 *          internalid -> custrecord_scv_project_source
 * =======================================================================================
 *  Date                Author                  Description
 *  20 Aug 2026         Huy Pham                Init, create file. Chức năng tạo tự động & Update  Project segment khi tạo & update Project, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d43037h)
 */
define(['N/search', 'N/record',
],(search, record,
) => {

    const findCsegProjectBySource = (_projectId) => {
        if(!_projectId) return "";

        let csegSearch = search.create({
            type: "customrecord_cseg_scv_sg_proj",
            filters:
            [
                ["custrecord_scv_project_source", "anyof", _projectId]
            ],
            columns:
            [
                "internalid"
            ]
        });

        let arrResult = csegSearch.run().getRange({start: 0, end: 1});

        return arrResult.length > 0 ? arrResult[0].id : "";
    }

    const updateCsegProject = (_projectRec) => {
        let projectId = _projectRec.id;
        if(!projectId) return "";

        let mapFieldValues = {
            name: _projectRec.getValue('entityid'),
            custrecord_scv_project_status: _projectRec.getValue('entitystatus'),
            custrecord_scv_project_completion_date: _projectRec.getValue('custentity_scv_project_completion_date'),
        };
        
        let csegProjectId = _projectRec.getValue("cseg_scv_sg_proj") || findCsegProjectBySource(projectId);

        //Edit: đã có Project Segment link tới Project thì update lại thông tin
        if(!!csegProjectId){
            record.submitFields({
                type: "customrecord_cseg_scv_sg_proj", id: csegProjectId,
                values: mapFieldValues,
                options: {
                    enableSourcing: false, ignoreMandatoryFields: true
                }
            });

            updateProjectRelated(_projectRec, csegProjectId);

            return csegProjectId;
        }

        //Create: chưa có thì tạo mới Project Segment và link Project source
        mapFieldValues["custrecord_scv_project_source"] = projectId;

        let csegProjectRec = record.create({type: "customrecord_cseg_scv_sg_proj", isDynamic: true});

        Object.keys(mapFieldValues).forEach(fieldId => {

            csegProjectRec.setValue(fieldId, mapFieldValues[fieldId]);
        });

        csegProjectId = csegProjectRec.save({enableSourcing: false, ignoreMandatoryFields: true});
        
        updateProjectRelated(_projectRec, csegProjectId);

        return csegProjectId;
    }

    const updateProjectRelated = (_projectRec, _csegProjectId) =>{
        let oldCsegProjectId = _projectRec.getValue("cseg_scv_sg_proj");

        if(oldCsegProjectId == _csegProjectId) return;

        record.submitFields({
            type: _projectRec.type, id: _projectRec.id,
            values: {
                cseg_scv_sg_proj: _csegProjectId
            },
            options: {
                enableSourcing: false, ignoreMandatoryFields: true
            }
        });
    }

    return {
        updateCsegProject,
    };

});
