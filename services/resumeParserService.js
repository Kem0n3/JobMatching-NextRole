const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { skillsList, degreeLevelsList, fieldsOfStudyList } = require('../config/selectData');

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9+\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function containsPhrase(haystack, needle) {
    if (!haystack || !needle) return false;
    return haystack.includes(` ${needle} `);
}

function logExtractionError(stage, filePath, error, context = {}) {
    console.error(`[resumeParser] ${stage} failed`, {
        userId: context.userId || null,
        filePath,
        errorMessage: error && error.message ? error.message : String(error)
    });
}

async function extractTextFromPDF(filePath, context = {}) {
    try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const parsed = await pdfParse(dataBuffer);
        return parsed.text || '';
    } catch (error) {
        logExtractionError('PDF extraction', filePath, error, context);
        return '';
    }
}

async function extractTextFromDOCX(filePath, context = {}) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value || '';
    } catch (error) {
        logExtractionError('DOC/DOCX extraction', filePath, error, context);
        return '';
    }
}

function extractSkillsFromText(rawText) {
    const normalized = ` ${normalizeText(rawText)} `;
    const detected = [];

    for (const skill of skillsList) {
        const normalizedLabel = normalizeText(skill.text);
        const normalizedId = normalizeText(skill.id.replace(/[_.-]/g, ' '));
        const matchedByLabel = normalizedLabel && containsPhrase(normalized, normalizedLabel);
        const matchedById = normalizedId && containsPhrase(normalized, normalizedId);

        if (matchedByLabel || matchedById) {
            detected.push(skill.id);
        }
    }

    return [...new Set(detected)];
}

function extractDegreeFromText(rawText) {
    const normalized = ` ${normalizeText(rawText)} `;
    const degreeKeywords = {
        doctorate: ['ph d', 'phd', 'doctorate', 'doctoral'],
        professional: ['jd', 'juris doctor', 'md', 'doctor of medicine'],
        masters: ['masters', 'master', 'm sc', 'msc', 'mba', 'meng', 'm eng'],
        bachelors: ['bachelors', 'bachelor', 'b sc', 'bsc', 'b eng', 'beng', 'b tech', 'undergraduate'],
        associate: ['associate degree', 'associate'],
        vocational: ['vocational', 'technical certificate'],
        highschool: ['high school', 'secondary school', 'a level']
    };

    const validDegreeIds = new Set(degreeLevelsList.map(level => level.id));
    for (const [degreeId, keywords] of Object.entries(degreeKeywords)) {
        if (!validDegreeIds.has(degreeId)) continue;
        if (keywords.some(keyword => containsPhrase(normalized, normalizeText(keyword)))) {
            return degreeId;
        }
    }

    return null;
}

function extractFieldFromText(rawText) {
    const normalized = ` ${normalizeText(rawText)} `;
    for (const field of fieldsOfStudyList) {
        const normalizedLabel = normalizeText(field.text);
        if (normalizedLabel && containsPhrase(normalized, normalizedLabel)) {
            return field.id;
        }
    }
    return null;
}

async function parseResume(filePath, context = {}) {
    const extension = path.extname(filePath).toLowerCase();
    let extractedText = '';

    if (extension === '.pdf') {
        extractedText = await extractTextFromPDF(filePath, context);
    } else if (extension === '.docx' || extension === '.doc') {
        extractedText = await extractTextFromDOCX(filePath, context);
    }

    if (!extractedText || extractedText.trim() === '') {
        console.warn('[resumeParser] No text extracted from resume', {
            userId: context.userId || null,
            filePath,
            extension
        });
        return {
            success: false,
            extractedText: '',
            skills: [],
            degreeLevel: null,
            fieldOfStudy: null
        };
    }

    return {
        success: true,
        extractedText: extractedText.substring(0, 5000),
        skills: extractSkillsFromText(extractedText),
        degreeLevel: extractDegreeFromText(extractedText),
        fieldOfStudy: extractFieldFromText(extractedText)
    };
}

module.exports = { parseResume };
