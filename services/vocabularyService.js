// services/vocabularyService.js
const {
    skillsList, degreeLevelsList, fieldsOfStudyList,
    locationsList, broaderCategoriesList, jobTypeList
} = require('../config/selectData');

function createMasterVocabulary() {
    const vocabulary = {
        featureMap: new Map(),
        vectorLength: 0,
        slices: {}
    };

    let currentIndex = 0;

    function addToVocabulary(list, sliceName) {
        const startIndex = currentIndex;
        list.forEach(item => {
            if (!vocabulary.featureMap.has(item.id)) {
                vocabulary.featureMap.set(item.id, currentIndex++);
            }
        });
        vocabulary.slices[sliceName] = { start: startIndex, end: currentIndex };
    }

    // categorical and binary features
    addToVocabulary(skillsList, 'skills');
    addToVocabulary(broaderCategoriesList, 'categories');
    addToVocabulary(degreeLevelsList, 'degrees');
    addToVocabulary(fieldsOfStudyList, 'fields');
    addToVocabulary(locationsList, 'locations');
    addToVocabulary(jobTypeList, 'jobTypes');

    //single dimension for remote work
    const remoteStartIndex = currentIndex;
    vocabulary.featureMap.set('remote', currentIndex++);
    vocabulary.slices['remote'] = { start: remoteStartIndex, end: currentIndex };


    vocabulary.vectorLength = currentIndex;
    console.log(`Master vocabulary created with ${vocabulary.vectorLength} dimensions.`);
    return vocabulary;
}

const masterVocabulary = createMasterVocabulary();

module.exports = masterVocabulary;