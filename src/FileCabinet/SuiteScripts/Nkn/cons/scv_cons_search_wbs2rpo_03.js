/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Huy Pham			    Init, create file
 */
define(["N/search",

    "../cons/scv_cons_search.js"
], (search,

    constSearch
) => {
    const TYPE = "transaction";
    const ID = "customsearch_scv_p2p_wbs_to_rpo_results";

    const Records = {};

    const getDataSource = (_params) => {
        let filters = [];

		if (_params.internalid) {
			filters.push(search.createFilter({
				name: 'internalid', operator: 'anyof', values: _params.internalid.toString().split(",")
			}));
		}
        if (_params.subsidiary) {
			filters.push(search.createFilter({
				name: 'subsidiary', operator: 'anyof', values: _params.subsidiary.toString().split(",")
			}));
		}
        if (_params.project) {
			filters.push(search.createFilter({
				name: 'custrecord_scv_project_source', join: 'cseg_scv_sg_proj', operator: 'anyof', values: _params.project.toString().split(",")
			}));
		}

        return constSearch.getDataSource(ID, filters, [], Records);
    };

    return {
        ID,
        TYPE,
        Records,
        getDataSource,
    };
});
