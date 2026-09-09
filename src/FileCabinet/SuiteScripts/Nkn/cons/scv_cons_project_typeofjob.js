/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  24 Aug 2026         Huy Pham			    Init, create file
 */
define([],
    () => {
        const Records = {
            BigJob: {
                ID: 1,
                NAME: "Big Job"
            },
            MinorJob: {
                ID: 2,
                NAME: "Minor Job"
            },
        }


        return {
            TYPE: "customlist_scv_project_type_of_job",
            Records,
        };
        
    });
    