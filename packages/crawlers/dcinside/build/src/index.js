"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
var dynamo_easy_1 = require("@shiftcoders/dynamo-easy");
var dcinside_crawler_1 = require("dcinside-crawler");
var firehose_1 = require("./firehose");
var _a = process.env, RECIPE_TABLE = _a.RECIPE_TABLE, DELIVERY_STREAM_NAME = _a.DELIVERY_STREAM_NAME, _b = _a.RECIPE_VERSION, RECIPE_VERSION = _b === void 0 ? '1' : _b, _c = _a.EXPIRE_DURATION, EXPIRE_DURATION = _c === void 0 ? '' + (15 * 60 * 1000) : _c, _d = _a.DOCUMENT_PAGE_SIZE, DOCUMENT_PAGE_SIZE = _d === void 0 ? '100' : _d, _e = _a.COMMENT_PAGE_SIZE, COMMENT_PAGE_SIZE = _e === void 0 ? '100' : _e, _f = _a.COVERING_DOCUMENTS, COVERING_DOCUMENTS = _f === void 0 ? '1000' : _f, _g = _a.LIMIT, LIMIT = _g === void 0 ? '1000' : _g, _h = _a.RPS, RPS = _h === void 0 ? '10' : _h, _j = _a.RETRIES, RETRIES = _j === void 0 ? '3' : _j;
if (RECIPE_TABLE == null)
    throw Error("RECIPE_TABLE env var is empty");
if (DELIVERY_STREAM_NAME == null)
    throw Error("DELIVERY_STREAM_NAME env var is empty");
var Recipe = /** @class */ (function () {
    function Recipe() {
        this.galleryId = "";
        this.version = 1;
        this.awakeAt = "";
    }
    __decorate([
        dynamo_easy_1.PartitionKey(),
        __metadata("design:type", String)
    ], Recipe.prototype, "galleryId", void 0);
    __decorate([
        dynamo_easy_1.SortKey(),
        dynamo_easy_1.GSIPartitionKey('AwakeAtIndex'),
        __metadata("design:type", Number)
    ], Recipe.prototype, "version", void 0);
    __decorate([
        dynamo_easy_1.GSISortKey('AwakeAtIndex'),
        __metadata("design:type", String)
    ], Recipe.prototype, "awakeAt", void 0);
    Recipe = __decorate([
        dynamo_easy_1.Model({ tableName: RECIPE_TABLE })
    ], Recipe);
    return Recipe;
}());
function recordToRecipe(rec) {
    var _a;
    return {
        id: rec.id,
        commentCount: rec.commentCount,
        likeCount: rec.likeCount,
        viewCount: rec.viewCount,
        lastCommentId: (_a = rec.comments) === null || _a === void 0 ? void 0 : _a.reduce(function (acc, comm) { return comm.id > acc ? comm.id : acc; }, 0),
    };
}
var recipeStore = new dynamo_easy_1.DynamoStore(Recipe);
var defaultCrawlProps = {
    coveringDocuments: 1000,
    maxSleep: 3600 * 1000 * 24,
    rps: 100,
    retries: 1,
    limit: 1000,
    timeLag: 60 * 60 * 1000,
    idLag: 100,
    periodBucketSize: 10,
    commentRequestBatchSize: 10,
    timeout: 10 * 60 * 1000,
};
function searchPage(crawler, gallery, documentId) {
    return __awaiter(this, void 0, void 0, function () {
        var page, documents;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    page = 1;
                    return [4 /*yield*/, crawler.documentHeaders(gallery, page)];
                case 1:
                    documents = _a.sent();
                    _a.label = 2;
                case 2:
                    if (!(documents[0].id < documentId || documents[documents.length - 1].id > documentId)) return [3 /*break*/, 4];
                    if (documents[0].id < documentId)
                        page = page - Math.ceil((-documents[0].id + documentId) / parseInt(DOCUMENT_PAGE_SIZE));
                    else
                        page = page + Math.ceil((documents[documents.length - 1].id - documentId) / parseInt(DOCUMENT_PAGE_SIZE));
                    return [4 /*yield*/, crawler.documentHeaders(gallery, page)];
                case 3:
                    documents = _a.sent();
                    return [3 /*break*/, 2];
                case 4: return [2 /*return*/, page];
            }
        });
    });
}
function crawlDocuments(crawler, gallery, lastLeastDocumentId, lastOldestDocumentId, coveringDocuments, limit, rps, retries) {
    return __awaiter(this, void 0, void 0, function () {
        var endPage, _a, startPage, documents, page, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!lastLeastDocumentId) return [3 /*break*/, 2];
                    return [4 /*yield*/, searchPage(crawler, gallery, lastLeastDocumentId)];
                case 1:
                    _a = (_e.sent());
                    return [3 /*break*/, 3];
                case 2:
                    _a = 0;
                    _e.label = 3;
                case 3:
                    endPage = (_a) +
                        Math.ceil(Math.min(coveringDocuments, (lastLeastDocumentId || 100000) - (lastOldestDocumentId || 0)) / parseInt(DOCUMENT_PAGE_SIZE));
                    startPage = Math.max(endPage - Math.ceil(limit / parseInt(DOCUMENT_PAGE_SIZE)), 1);
                    documents = [];
                    console.log("limit: " + limit + ", coveringDocuments: " + coveringDocuments);
                    console.log("crawl " + gallery.id + " page " + startPage + " ~ " + endPage);
                    page = startPage;
                    _e.label = 4;
                case 4:
                    if (!(page <= endPage)) return [3 /*break*/, 7];
                    _c = (_b = documents.push).apply;
                    _d = [documents];
                    return [4 /*yield*/, crawler.documentHeaders(gallery, page)];
                case 5:
                    _c.apply(_b, _d.concat([_e.sent()]));
                    if (documents[documents.length - 1].id <= (lastOldestDocumentId || 0))
                        return [3 /*break*/, 7];
                    _e.label = 6;
                case 6:
                    ++page;
                    return [3 /*break*/, 4];
                case 7:
                    console.log('last oldest docs', lastOldestDocumentId);
                    return [2 /*return*/, { documents: documents.filter(function (doc) { return doc.id >= (lastOldestDocumentId || 0); }), startPage: startPage, endPage: endPage }];
            }
        });
    });
}
function crawl(recipe, props) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function () {
        var _e, coveringDocuments, maxSleep, rps, retries, timeLag, idLag, limit, periodBucketSize, commentRequestBatchSize, timeout, now, crawler, lastLeastDocumentId, lastOldestDocumentId, gallery, _f, documents, startPage, endPage, records, index, lastDocumentById, nextIndex, commentRequestCount, commentses, _loop_1, i;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _e = Object.assign(defaultCrawlProps, props), coveringDocuments = _e.coveringDocuments, maxSleep = _e.maxSleep, rps = _e.rps, retries = _e.retries, timeLag = _e.timeLag, idLag = _e.idLag, limit = _e.limit, periodBucketSize = _e.periodBucketSize, commentRequestBatchSize = _e.commentRequestBatchSize, timeout = _e.timeout;
                    now = new Date();
                    crawler = new dcinside_crawler_1.RawCrawler(rps, retries);
                    lastLeastDocumentId = (_a = recipe.lastDocuments) === null || _a === void 0 ? void 0 : _a.reduce(function (acc, doc) { return acc >= doc.id ? acc : doc.id; }, 0);
                    lastOldestDocumentId = (_b = recipe.lastDocuments) === null || _b === void 0 ? void 0 : _b.reduce(function (acc, doc) { return acc <= doc.id ? acc : doc.id; }, 999999999999);
                    gallery = { id: recipe.galleryId, isMiner: recipe.galleryIsMiner ? true : false };
                    return [4 /*yield*/, crawlDocuments(crawler, gallery, lastLeastDocumentId, lastOldestDocumentId, coveringDocuments, limit, rps, retries)];
                case 1:
                    _f = _g.sent(), documents = _f.documents, startPage = _f.startPage, endPage = _f.endPage;
                    records = [];
                    index = documents.length;
                    lastDocumentById = ((_c = recipe.lastDocuments) === null || _c === void 0 ? void 0 : _c.reduce(function (acc, doc) { return (acc[doc.id] = doc, acc); }, {})) || {};
                    _g.label = 2;
                case 2:
                    if (!(new Date().getTime() - now.getTime() < timeout && index > 0)) return [3 /*break*/, 4];
                    nextIndex = index;
                    commentRequestCount = 0;
                    while (nextIndex > 0 && commentRequestCount < commentRequestBatchSize) {
                        commentRequestCount += Math.ceil(documents[nextIndex - 1].commentCount / parseInt(COMMENT_PAGE_SIZE));
                        nextIndex -= 1;
                    }
                    return [4 /*yield*/, Promise.all(documents.slice(nextIndex, index).map(function (doc) {
                            if (doc.commentCount && (lastDocumentById[doc.id] == null || lastDocumentById[doc.id].commentCount < doc.commentCount)) {
                                return crawler.comments(doc);
                            }
                            else {
                                return null;
                            }
                        }))];
                case 3:
                    commentses = _g.sent();
                    _loop_1 = function (i) {
                        var doc = documents[i];
                        var comments = (_d = commentses[i - nextIndex]) === null || _d === void 0 ? void 0 : _d.filter(function (comm) { return comm.id > ((lastDoc === null || lastDoc === void 0 ? void 0 : lastDoc.lastCommentId) || 0); });
                        var lastDoc = lastDocumentById[doc.id];
                        if (lastDoc == null ||
                            lastDoc.viewCount * 1.25 < doc.viewCount ||
                            lastDoc.likeCount * 1.25 < doc.likeCount ||
                            lastDoc.commentCount < doc.commentCount)
                            records.push(Object.assign(doc, {
                                comments: comments === null || comments === void 0 ? void 0 : comments.map(function (comm) {
                                    var _a;
                                    var document = comm.document, parent = comm.parent, rest = __rest(comm, ["document", "parent"]);
                                    return Object.assign(rest, {
                                        parentId: (_a = comm.parent) === null || _a === void 0 ? void 0 : _a.id
                                    });
                                })
                            }));
                    };
                    for (i = nextIndex; i < index; ++i) {
                        _loop_1(i);
                    }
                    index = nextIndex;
                    return [3 /*break*/, 2];
                case 4:
                    if (startPage > 1 || index > 0)
                        recipe.awakeAt = now.toISOString();
                    else
                        recipe.awakeAt = new Date(now.getTime() + Math.min(now.getTime() - documents[Math.min(periodBucketSize, documents.length - 1)].createdAt.getTime(), maxSleep)).toISOString();
                    recipe.lastDocuments = records.map(function (rec) { return recordToRecipe(rec); });
                    return [2 /*return*/, { recipe: recipe, records: records }];
            }
        });
    });
}
function main(galleryId) {
    return __awaiter(this, void 0, void 0, function () {
        var recipe, _a, newRecipe, records;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, recipeStore.get(galleryId, parseInt(RECIPE_VERSION)).exec()];
                case 1:
                    recipe = _b.sent();
                    if (recipe == null)
                        throw Error("galleryId=" + galleryId + "/version=" + RECIPE_VERSION + " does not exists on " + RECIPE_TABLE);
                    if (!recipe.awakeAt) return [3 /*break*/, 3];
                    return [4 /*yield*/, recipeStore.update(recipe.galleryId, recipe.version)
                            .updateAttribute('awakeAt').set(new Date(new Date().getTime() + parseInt(EXPIRE_DURATION)).toISOString())
                            .onlyIfAttribute('awakeAt').eq(recipe.awakeAt)
                            .exec()];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, recipeStore.update(recipe.galleryId, recipe.version)
                        .updateAttribute('awakeAt').set(new Date(new Date().getTime() + parseInt(EXPIRE_DURATION)).toISOString())
                        .onlyIfAttribute('awakeAt').attributeNotExists()
                        .exec()];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5: return [4 /*yield*/, crawl(recipe, {
                        coveringDocuments: parseInt(COVERING_DOCUMENTS),
                        limit: parseInt(LIMIT),
                        rps: parseInt(RPS),
                        retries: parseInt(RETRIES),
                    })];
                case 6:
                    _a = _b.sent(), newRecipe = _a.recipe, records = _a.records;
                    console.log("send records");
                    return [4 /*yield*/, firehose_1.send(DELIVERY_STREAM_NAME, records)];
                case 7:
                    _b.sent();
                    console.log("update recipe");
                    return [4 /*yield*/, recipeStore.put(newRecipe).exec()];
                case 8:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
module.exports = {
    main: main,
    Recipe: Recipe,
    recipeStore: recipeStore,
};
//# sourceMappingURL=index.js.map