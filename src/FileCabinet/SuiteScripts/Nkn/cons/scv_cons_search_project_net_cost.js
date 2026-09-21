/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  18 Sep 2026         Huy Pham			    Init, create file
 */
define(["N/search",

    "../cons/scv_cons_search.js"
], (search,

    constSearch
) => {
    const TYPE = "wbs";
    const ID = "customsearch_scv_project_net_cost";

    const Records = {};

    const getDataSource = (_params) => {
        let filters = [];

		if (_params.internalid) {
			filters.push(search.createFilter({
				name: 'internalid', operator: 'anyof', values: _params.internalid.toString().split(",")
			}));
		}
        if (_params.project) {
			filters.push(search.createFilter({
				name: 'project', operator: 'anyof', values: _params.project.toString().split(",")
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
