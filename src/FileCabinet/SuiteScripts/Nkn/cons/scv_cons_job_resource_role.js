/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  27 Sep 2026         Thanh Hoan			    Init, create file
 */
define([],
    () => {
        const Records = {
            AssistProjectManager: {
                ID: 3,
                NAME: "Assist.Project Manager"
            },
            Employee: {
                ID: -2,
                NAME: "Employee"
            },
            ProjectGenManager: {
                ID: 2,
                NAME: "Project Gen. Manager"
            },
            ProjectManager: {
                ID: -3,
                NAME: "Project Manager"
            },
        }

        return {
            TYPE: "jobresourcerole",
            Records,
        };
        
    });
