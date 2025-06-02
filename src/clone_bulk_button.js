/*
@rootVar: EC_CLONE_BULK_BUTTON
@name: Clone Bulk Button add-on
@version: 1.0.0 
@description: Extracellular Clone Bulk Button add-on for eLab
@requiredElabVersion: 2.35.0
@author: Extracellular
*/

var EC_CLONE_BULK_BUTTON = {};

function make_clone_name(orig) {
  const m = orig.match(/^(.*) \(cloned\)(?: (\d+))?$/);
  if (!m) {
    return `${orig} (cloned)`;
  }
  const base = m[1];
  const num = m[2] ? parseInt(m[2], 10) + 1 : 1;
  return `${base} (cloned) ${num}`;
}

(function (context) {
  context.init = function (data) {

    let clone_samples = function() {
      const samples = eLabSDK2.Inventory.Sample.SampleList.getSelectedSamples()
      // save the original names and sample IDs of the samples you want to clone, these will be the parent IDS
      const original_names = {};
      samples.forEach(sample => original_names[sample.sampleID] = sample.name);

      samples.forEach(sample => {
        // Clone
        eLabSDK.API.call({
          method: 'POST',
          path: 'samples/{sampleID}/clone',
          pathParams: {sampleID: sample.sampleID},
          body: {cloneTimes: 1, trackParent: true, ignoreAutoNumbering: true},
          onSuccess: () => {
            console.log(`Sample ${sample.name} with ID ${sample.sampleID} cloned successfully.`);

            // Fetch the cloned sample's children
            eLabSDK.API.call({
              method: 'GET',
              path: 'samples/{sampleID}/children',
              pathParams: {sampleID: sample.sampleID},
              onSuccess: (child_xhr, child_status, child_response) => {
                const list = child_response.data || child_response; // Handle both cases where children might be in data or directly in response
                const unarchived = list.filter(child => !child.archived);
                const clone = unarchived[unarchived.length - 1] // Find the newest un-archived child
                if (!clone) {
                  console.warn(`No active clone found for sample ${sample.name} with ID ${sample.sampleID}`);
                  return;
                }

                // Rename the cloned sample
                const new_name = make_clone_name(original_names[sample.sampleID]);
                console.log(`Renaming cloned sample ${clone.name} with ID ${clone.sampleID} to ${new_name}`);
                eLabSDK.API.call({
                  method: 'PATCH',
                  path: 'samples/{sampleID}',
                  pathParams: {sampleID: clone.sampleID},
                  body: {
                    name: new_name,
                    quantitySettings: {
                      unit: context.settings?.unit || 'Unit',
                      displayUnit: context.settings?.displayUnit || 'Unit'
                    }
                  },
                  onSuccess: (rename_xhr, rename_status, rename_response) => {
                    // eLabSDK2.UI.Toast.showToast(`Renamed cloned sample ${clone.sampleID} to ${new_name}, PLEASE REFRESH THE PAGE`);
                    console.log(`Renamed cloned sample ${clone.sampleID} to ${new_name}`);
                  },
                  onError: (rename_xhr, rename_status, rename_error) => {
                    eLabSDK2.UI.Toast.showToast(`Error renaming cloned sample ${clone.sampleID}`);
                    console.error(`Error renaming cloned sample ${clone.sampleID}:`, rename_error);
                    console.error('Response:', rename_xhr);
                    console.error('Status:', rename_status);
                  }
                });
              },
              onError: (child_xhr, child_status, child_error) => {
                eLabSDK2.UI.Toast.showToast(`Error fetching children for sample ${sample.sampleID}`);
                console.error(`Error fetching children for sample ${sample.name} with ID ${sample.sampleID}:`, child_error);
                console.error('Response:', child_xhr);
                console.error('Status:', child_status);
              }
            });

          },
          onError: (xhr, status, error) => {
            eLabSDK2.UI.Toast.showToast(`Error cloning sample ${sample.sampleID}`);
            console.error(`Error cloning sample ${sample.name} with ID ${sample.sampleID}:`, error);
            console.error('Response:', xhr);
            console.error('Status:', status);
          }
        })
      });

      eLabSDK2.UI.Toast.showToast(`CLONE PROCESS DONE!!!!!, PLEASE REFRESH THE PAGE`);
    }

    let bulkActionButton = {
        id: 'bulkActionButton',
      title: 'Clone selected samples',
      label: 'Clone',
      icon: 'fas fa-clone', // font awesome icon, Optional
      onClick: () => {
          clone_samples()
      },
      isVisible: () => { // Optional, will be displayed by default if not provided.
          return true
      }
    }
    
    eLabSDK2.Inventory.Sample.SampleList.registerAction(bulkActionButton)
  };

})(EC_CLONE_BULK_BUTTON)

