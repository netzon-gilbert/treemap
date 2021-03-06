// the core off treemap where computation takes place
var TreemapCore = /** @class */ (function () {
    function TreemapCore() {
    }
    TreemapCore.prototype.sortData = function (data) {
        var newData = data;
        newData = data.sort(function (a, b) {
            if (a.value === b.value) {
                return 0;
            }
            else {
                return b.value - a.value;
            }
        });
        return newData;
    };
    TreemapCore.prototype.tableDim = function (cells, rows, width, height) {
        var cols = 1, numOfCells;
        for (var i = 0; i < cells; i++) {
            cols = i + 1;
            numOfCells = cols * rows;
            if (numOfCells >= cells) {
                break;
            }
        }
        return {
            cols: cols,
            rows: rows,
            emptyCells: numOfCells - cells,
            cellWidth: width / cols,
            cellHeight: height / rows
        };
    };
    TreemapCore.prototype.getBestSample = function (numOfSamples, entries) {
        var samples = entries.sort(function (a, b) {
            return a.hwDiff - b.hwDiff;
        });
        samples.splice(numOfSamples, samples.length);
        samples = samples.sort(function (a, b) {
            return a.emptyCells - b.emptyCells;
        });
        return samples.splice(0, 1);
    };
    TreemapCore.prototype.bufferize = function (entries, model, width, height) {
        var items = entries, converted = [], row, col, x, y;
        // push dummy entries
        for (var i = 0; i < model.emptyCells; i++) {
            items.push({
                label: '',
                color: '#D9D9D9',
                value: 10
            });
        }
        for (var i = 0; i < items.length; i++) {
            // detect witch row
            row = Math.floor(i / model.cols);
            col = i % model.cols;
            // push computed data
            converted.push({
                entries: [items[i]],
                h: model.cellHeight,
                w: model.cellWidth,
                x: col * model.cellWidth,
                y: row * model.cellHeight,
                area: model.cellHeight * model.cellWidth
            });
        }
        return converted;
    };
    TreemapCore.prototype.partitionEqual = function (width, height, arry) {
        var mainVars = {
            entries: arry,
            width: width,
            height: height,
            loop: true
        }, sampleCell = {
            recentChange: 0,
            currentChange: 0
        }, table = {
            cols: 0,
            rows: 1,
            cellWidth: 0,
            cellHeight: 0,
            emptyCells: 0,
            hwDiff: 0
        }, samples = [], dimension;
        // initiation
        table.cellWidth = mainVars.width / mainVars.entries.length;
        table.cellHeight = mainVars.height;
        sampleCell.currentChange = Math.abs(table.cellWidth - table.cellHeight);
        table.cols = mainVars.entries.length;
        table.rows = 1;
        table.emptyCells = 0;
        // testing table
        for (var i = 0; i < mainVars.entries.length; i++) {
            var tempTable = this.tableDim(mainVars.entries.length, i + 1, mainVars.width, mainVars.height);
            table = {
                cols: tempTable.cols,
                rows: tempTable.rows,
                emptyCells: tempTable.emptyCells,
                cellWidth: tempTable.cellWidth,
                cellHeight: tempTable.cellHeight
            };
            sampleCell.recentChange = sampleCell.currentChange;
            sampleCell.currentChange = Math.abs(table.cellWidth - table.cellHeight);
            table.hwDiff = sampleCell.currentChange;
            samples.push(table);
        }
        dimension = this.getBestSample(5, samples);
        return this.bufferize(mainVars.entries, dimension[0], width, height);
    };
    TreemapCore.prototype.partition = function (parent) {
        var fChild = {
            entries: null,
            x: parent.x,
            y: parent.y,
            w: null,
            h: null,
            area: null,
            total: null
        }, sChild = {
            entries: null,
            x: null,
            y: null,
            w: null,
            h: null,
            area: null,
            total: null
        }, partitionIndex, sum;
        // find partition index
        sum = 0;
        for (var i = 0; i < parent.entries.length; i++) {
            sum += parent.entries[i].value;
            if (sum > (parent.total / 2)) {
                if (i <= 0) {
                    partitionIndex = 0;
                }
                else if ((sum - (parent.total / 2)) >
                    ((parent.total / 2) - (sum - parent.entries[i].value))) {
                    partitionIndex = i - 1;
                }
                else {
                    partitionIndex = i;
                }
                break;
            }
        }
        // find area and total
        sum = 0;
        for (var i = 0; i < partitionIndex + 1; i++) {
            sum += parent.entries[i].value;
        }
        fChild.total = sum;
        fChild.area = (sum / parent.total) * parent.area;
        sChild.total = parent.total - sum;
        sChild.area = parent.area - fChild.area;
        // find the partition layout; assign size and position
        if (parent.w >= parent.h) {
            // vertical
            fChild.w = fChild.area / parent.h;
            fChild.h = parent.h;
            sChild.w = parent.w - fChild.w;
            sChild.h = parent.h;
            sChild.x = fChild.x + fChild.w;
            sChild.y = fChild.y;
        }
        else {
            // horizontal
            fChild.w = parent.w;
            fChild.h = fChild.area / parent.w;
            sChild.w = parent.w;
            sChild.h = parent.h - fChild.h;
            sChild.x = fChild.x;
            sChild.y = fChild.y + fChild.h;
        }
        // partition parent
        fChild.entries = parent.entries.splice(0, partitionIndex + 1);
        sChild.entries = parent.entries;
        return [fChild, sChild];
    };
    TreemapCore.prototype.decompose = function (width, height, data, equal) {
        var partitions = [], dataTotal = 0, dataEntries = data, tempIndex, option = false;
        if (equal) {
            option = equal;
        }
        function isBreakable() {
            var breakable = false, breakIndex;
            for (var i = 0; i < partitions.length; i++) {
                if (partitions[i].entries.length > 1) {
                    breakable = true;
                    breakIndex = i;
                    break;
                }
            }
            tempIndex = breakIndex;
            return breakable;
        }
        function breakAPart(i, self) {
            var parent, children;
            parent = partitions[i];
            children = self.partition(parent);
            partitions.push(children[0]);
            partitions.push(children[1]);
            partitions.splice(i, 1);
        }
        if (!option) {
            // clean the entries
            for (var i = 0; i < dataEntries.length; i++) {
                if (dataEntries[i].value <= 0) {
                    dataEntries.splice(i, 1);
                }
            }
            for (var i = 0; i < dataEntries.length; i++) {
                dataTotal += dataEntries[i].value;
            }
            // initiate parent entries
            partitions.push({
                entries: dataEntries,
                x: 0,
                y: 0,
                w: width,
                h: height,
                total: dataTotal,
                area: width * height
            });
            while (isBreakable()) {
                breakAPart(tempIndex, this);
            }
        }
        else {
            partitions = this.partitionEqual(width, height, dataEntries);
        }
        return partitions;
    };
    TreemapCore.prototype.generate = function (width, height, data, equal) {
        var sortedData, option = false;
        if (equal) {
            option = equal;
        }
        if (equal) {
            sortedData = data;
        }
        else {
            sortedData = this.sortData(data);
        }
        return this.decompose(width, height, sortedData, option);
    };
    return TreemapCore;
}());
// responsible for showing the visible table
var TreemapMain = /** @class */ (function () {
    function TreemapMain() {
        this.play = false;
        this.tipsAlwaysVisible = false;
        this.equalpartition = true;
        this.core = null;
        this.mouse = {
            click: {
                x: -5,
                y: -5
            },
            hover: {
                x: null,
                y: null
            }
        };
    }
    TreemapMain.prototype.updateBuffers = function (w, h, data) {
        this.childBuffer = [];
        this.buffer = [];
        this.buffer = this.core.generate(w, h, data, this.equalpartition);
        for (var i = 0; i < this.buffer.length; i++) {
            if (this.buffer[i].entries[0].children) {
                var temp = this.core.generate(this.buffer[i].w, this.buffer[i].h, this.buffer[i].entries[0].children), addX = this.buffer[i].x, addY = this.buffer[i].y;
                for (var j = 0; j < temp.length; j++) {
                    temp[j].x += addX;
                    temp[j].y += addY;
                    this.childBuffer.push(temp[j]);
                }
            }
        }
    };
    TreemapMain.prototype.setDrawboard = function (id, w, h, data) {
        this.core = new TreemapCore();
        this.width = w;
        this.height = h;
        this.self = document.getElementById(id);
        this.canv = this.self.getContext('2d');
        this.updateBuffers(w, h, data);
    };
    TreemapMain.prototype.clear = function () {
        this.canv.clearRect(0, 0, this.width, this.height);
    };
    TreemapMain.prototype.drawParentRects = function () {
        for (var i = 0; i < this.buffer.length; i++) {
            var textX = 15, textY = 20;
            this.canv.beginPath();
            // this.canv.save();
            this.canv.lineWidth = 0.25;
            this.canv.strokeStyle = 'white';
            // draw rect
            this.canv.fillStyle = this.buffer[i].entries[0].color;
            this.canv.fillRect(this.buffer[i].x, this.buffer[i].y, this.buffer[i].w, this.buffer[i].h);
            this.canv.strokeRect(this.buffer[i].x, this.buffer[i].y, this.buffer[i].w, this.buffer[i].h);
            this.canv.stroke();
            this.canv.fill();
            // draw label
            this.canv.fillStyle = 'white';
            if (this.buffer[i].entries[0].label) {
                this.canv.font = 'bold 14px arial';
                var textLength = this.canv.measureText(this.buffer[i].entries[0].label);
                if ((textLength["width"] + (textX)) > (this.buffer[i].w - textX)) {
                    // console.log(this.buffer[i].entries[0].label);
                    // identify devisions
                    var count = this.wrapText(this.canv, this.buffer[i].entries[0].label, (this.buffer[i].x + textX), (this.buffer[i].y + textY), (this.buffer[i].w - textX), 15);
                    textY += (count * 15);
                }
                else {
                    this.canv.fillText(this.buffer[i].entries[0].label, this.buffer[i].x + textX, this.buffer[i].y + textY);
                }
                this.canv.fill();
                textY += 15;
            }
            if (this.buffer[i].entries[0].captions) {
                for (var j = 0; j < this.buffer[i].entries[0].captions.length; j++) {
                    this.canv.fillStyle = 'white';
                    this.canv.font = 'normal 11px arial';
                    var textLength = this.canv.measureText(this.buffer[i].entries[0].captions[j]);
                    if ((textLength["width"] + (textX)) > (this.buffer[i].w - textX)) {
                        // identify devisions
                        var count = this.wrapText(this.canv, this.buffer[i].entries[0].captions[j], (this.buffer[i].x + textX), (this.buffer[i].y + textY), (this.buffer[i].w - textX), 15);
                        textY += (count * 15);
                    }
                    else {
                        this.canv.fillText(this.buffer[i].entries[0].captions[j], this.buffer[i].x + textX, this.buffer[i].y + textY);
                    }
                    this.canv.fill();
                    textY += 15;
                }
            }
            //this.canv.restore();
            this.canv.closePath();
        }
    };
    TreemapMain.prototype.wrapText = function (context, text, x, y, maxWidth, lineHeight) {
        var words = text.split(' '), line = '', lineCount = 0, test, metrics;
        for (var i = 0; i < words.length; i++) {
            test = words[i];
            metrics = context.measureText(test);
            while (metrics.width > maxWidth) {
                // Determine how much of the word will fit
                test = test.substring(0, test.length - 1);
                metrics = context.measureText(test);
            }
            if (words[i] != test) {
                words.splice(i + 1, 0, words[i].substr(test.length));
                words[i] = test;
            }
            test = line + words[i] + ' ';
            metrics = context.measureText(test);
            if (metrics.width > maxWidth && i > 0) {
                context.fillText(line, x, y);
                line = words[i] + ' ';
                y += lineHeight;
                lineCount++;
            }
            else {
                line = test;
            }
        }
        context.fillText(line, x, y);
        return lineCount;
    };
    TreemapMain.prototype.drawChildRects = function () {
        for (var i = 0; i < this.childBuffer.length; i++) {
            this.canv.beginPath();
            this.canv.lineWidth = 0.25;
            this.canv.strokeStyle = 'white';
            this.canv.strokeRect(this.childBuffer[i].x, this.childBuffer[i].y, this.childBuffer[i].w, this.childBuffer[i].h);
            this.canv.stroke();
            this.canv.closePath();
        }
    };
    TreemapMain.prototype.drawHover = function (i) {
        var textX = 15, textY = 20, textColor = 'rgba(255, 255, 255, 0.4)';
        try {
            this.canv.beginPath();
            this.canv.fillStyle = 'rgba(0, 0, 0, 0.1)';
            this.canv.fillRect(this.buffer[i].x, this.buffer[i].y, this.buffer[i].w - 1, this.buffer[i].h - 1);
            this.canv.stroke();
            this.canv.fill();
            this.canv.closePath();
        }
        catch (err) {
            // console.log('minor error')
        }
    };
    TreemapMain.prototype.drawClick = function () {
        var index = this.cursorOverThis(this.mouse.click.x, this.mouse.click.y);
        try {
            this.canv.beginPath();
            this.canv.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.canv.fillRect(this.buffer[index].x, this.buffer[index].y, this.buffer[index].w, this.buffer[index].h);
            this.canv.stroke();
            this.canv.fill();
            this.canv.closePath();
        }
        catch (err) {
            // console.log('minor error');
        }
    };
    TreemapMain.prototype.drawTips = function () {
        var recTooSmall = false, visibleWidth = 100, visibleHeight = 50, x = this.mouse.hover.x, y = this.mouse.hover.y, hoverIndex = this.cursorOverThis(x, y), tipWidth = 300, tipHeight = 100, margin = 20, padding = 10, backColor = 'rgba(255, 255, 255, 0.9)', shadowColor = 'rgba(0, 0, 0, 0.4)', shadowBlur = 20, lineSpace = 15, fontColor = 'black', fx, fy, // rect points
        lx, ly, ax, ay, arrowWidth = 20, tx, ty; // text point
        try {
            if (this.buffer[hoverIndex].w < visibleWidth ||
                this.buffer[hoverIndex].h < visibleHeight) {
                recTooSmall = true;
            }
        }
        catch (err) {
            // console.log('[cursor not on the treemap]: ' + err)
        }
        function drawBox(self) {
            self.canv.beginPath();
            self.canv.shadowBlur = shadowBlur;
            self.canv.shadowColor = shadowColor;
            self.canv.moveTo(ax, fy);
            self.canv.lineTo(lx, fy);
            self.canv.lineTo(lx, ly);
            self.canv.lineTo(fx, ly);
            self.canv.lineTo(fx, ay);
            self.canv.lineTo(x, y);
            self.canv.lineTo(ax, fy);
            self.canv.fill();
            self.canv.closePath();
            self.canv.shadowBlur = 0;
        }
        function drawText(index, self) {
            var textY = ty;
            self.canv.beginPath();
            if (self.buffer[index].entries[0].label) {
                self.canv.fillStyle = fontColor;
                self.canv.font = 'bold 14px arial';
                var textLength = self.canv.measureText(self.buffer[index].entries[0].label);
                if (textLength["width"] > 290) {
                    // console.log(self.buffer[i].entries[0].label);
                    // identify devisions
                    var count = self.wrapText(self.canv, self.buffer[index].entries[0].label, tx, textY, 920, 15);
                    textY += count * 15;
                }
                else {
                    self.canv.fillText(self.buffer[index].entries[0].label, tx, textY);
                }
                self.canv.fill();
                textY += lineSpace;
            }
            if (self.buffer[index].entries[0].captions) {
                self.canv.fillStyle = fontColor;
                for (var j = 0; j < self.buffer[index].entries[0].captions.length; j++) {
                    self.canv.font = 'normal 11px arial';
                    var textLength = self.canv.measureText(self.buffer[index].entries[0].captions[j]);
                    if (textLength["width"] > 290) {
                        // console.log(self.buffer[i].entries[0].label)
                        // identify devisions
                        var count = self.wrapText(self.canv, self.buffer[index].entries[0].captions[j], tx, textY, 290, 15);
                        textY += count * 15;
                    }
                    else {
                        self.canv.fillText(self.buffer[index].entries[0].captions[j], tx, textY);
                    }
                    textY += lineSpace;
                    self.canv.fill();
                }
            }
            self.canv.closePath();
        }
        function calculatePos(self) {
            // manipulate x, y position
            if (x < (self.width - margin - tipWidth)) {
                fx = x + margin;
                lx = fx + tipWidth;
                ax = fx + arrowWidth;
                tx = fx + padding;
            }
            else {
                fx = x - margin;
                lx = fx - tipWidth;
                ax = fx - arrowWidth;
                tx = lx + padding;
            }
            if (y < (self.height - margin - tipHeight)) {
                fy = y + margin;
                ly = fy + tipHeight;
                ay = fy + arrowWidth;
                ty = fy + padding + 10;
            }
            else {
                fy = y - margin;
                ly = fy - tipHeight;
                ay = fy - arrowWidth;
                ty = ly + padding + 10;
            }
        }
        if (this.tipsAlwaysVisible || recTooSmall) {
            this.canv.fillStyle = backColor;
            calculatePos(this);
            drawBox(this);
            try {
                drawText(hoverIndex, this);
            }
            catch (err) {
                // console.log('error in drawing text')
            }
        }
    };
    TreemapMain.prototype.cursorOverThis = function (x, y) {
        var out;
        for (var i = 0; i < this.buffer.length; i++) {
            if (this.buffer[i].x <= x &&
                x <= (this.buffer[i].x + this.buffer[i].w) &&
                // y pos
                this.buffer[i].y <= y &&
                y <= (this.buffer[i].y + this.buffer[i].h)) {
                out = i;
                break;
            }
        }
        return out;
    };
    TreemapMain.prototype.render = function () {
        var _this = this;
        setTimeout(function () {
            if (_this.play) {
                _this.clear();
                _this.drawParentRects();
                _this.drawChildRects();
                _this.drawHover(_this.cursorOverThis(_this.mouse.hover.x, _this.mouse.hover.y));
                _this.drawClick();
                _this.drawTips();
                _this.render();
            }
        }, 20);
    };
    TreemapMain.prototype.setPlay = function (p) {
        this.play = p;
        this.render();
    };
    TreemapMain.prototype.tipAlwaysVisible = function (value) {
        this.tipsAlwaysVisible = value;
    };
    TreemapMain.prototype.setClickPos = function (x, y) {
        this.mouse.click.x = x;
        this.mouse.click.y = y;
    };
    TreemapMain.prototype.setHoverPos = function (x, y) {
        this.mouse.hover.x = x;
        this.mouse.hover.y = y;
    };
    TreemapMain.prototype.draw = function () {
        this.drawParentRects();
        this.drawChildRects();
    };
    TreemapMain.prototype.getCLickIndex = function () {
        return this.cursorOverThis(this.mouse.hover.x, this.mouse.hover.y);
    };
    TreemapMain.prototype.getClickedItem = function () {
        var selected = {
            parents: null,
            selected: null
        }, parents = [];
        for (var i = 0; i < this.buffer.length; i++) {
            parents.push(this.buffer[i].entries[0]);
        }
        selected.parents = parents;
        selected.selected = this.buffer[this.cursorOverThis(this.mouse.hover.x, this.mouse.hover.y)].entries[0];
        return selected;
    };
    TreemapMain.prototype.getBuffers = function () {
        return {
            'parent': this.buffer,
            'child': this.childBuffer
        };
    };
    TreemapMain.prototype.updateData = function (data, isEqual) {
        this.mouse.click.x = -5;
        this.mouse.click.y = -5;
        this.equalpartition = isEqual;
        this.updateBuffers(this.width, this.height, data);
        this.drawParentRects();
        this.drawChildRects();
    };
    TreemapMain.prototype.init = function (id, w, h, data, isEqual) {
        this.equalpartition = isEqual;
        this.setDrawboard(id, w, h, data);
        this.draw();
    };
    return TreemapMain;
}());
// responsible for showing the transition effect
var TreemapTransition = /** @class */ (function () {
    function TreemapTransition() {
        this.transitionTime = 2000;
        this.renderTime = 16; // deprecated
        this.effects = 'fade'; // transition effects
        this.effectsDir = 'out';
        this.play = false;
        this.origin = null; // deprecated
        this.centerIndex = null; // deprecated
        this.originItem = null; // deprecated
        this.speed = 15; // deprecated
        this.mouse = {
            click: {
                x: null,
                y: null
            }
        };
        this.animation = {
            fade: function (direction) {
                if (direction === 'in') {
                    //    console.log('fade in')
                }
                else if (direction === 'out') {
                    //    console.log('fade out')
                }
            }
        };
        // expose variables
        // child object dependencies
        this.core = null; // deprecated
    }
    TreemapTransition.prototype.setStyle = function (el) {
        el.style.opacity = '0';
    };
    TreemapTransition.prototype.setDrawboard = function (id, w, h) {
        this.core = new TreemapCore(); // deprecated
        this.width = w;
        this.height = h;
        this.self = document.getElementById(id);
        this.canv = this.self.getContext('2d');
        this.setStyle(this.self);
    };
    TreemapTransition.prototype.drawParentRects = function () {
        for (var i = 0; i < this.buffer.length; i++) {
            var textX = 15, textY = 20;
            this.canv.beginPath();
            this.canv.lineWidth = 0.25;
            this.canv.strokeStyle = 'white';
            // draw rect
            this.canv.fillStyle = this.buffer[i].entries[0].color;
            this.canv.fillRect(this.buffer[i].x, this.buffer[i].y, this.buffer[i].w, this.buffer[i].h);
            this.canv.strokeRect(this.buffer[i].x, this.buffer[i].y, this.buffer[i].w, this.buffer[i].h);
            this.canv.stroke();
            this.canv.fill();
            // draw label
            if (this.buffer[i].entries[0].label) {
                this.canv.fillStyle = 'white';
                this.canv.font = 'bold 14px arial';
                this.canv.fillText(this.buffer[i].entries[0].label, this.buffer[i].x + textX, this.buffer[i].y + textY);
                this.canv.fill();
                textY += 15;
            }
            if (this.buffer[i].entries[0].captions) {
                for (var j = 0; j < this.buffer[i].entries[0].captions.length; j++) {
                    this.canv.fillStyle = 'white';
                    this.canv.font = 'normal 11px arial';
                    this.canv.fillText(this.buffer[i].entries[0].captions[j], this.buffer[i].x + textX, this.buffer[i].y + textY);
                    this.canv.fill();
                    textY += 15;
                }
            }
            this.canv.closePath();
        }
    };
    TreemapTransition.prototype.drawChildRects = function () {
        for (var i = 0; i < this.childBuffer.length; i++) {
            this.canv.beginPath();
            this.canv.lineWidth = 0.25;
            this.canv.strokeStyle = 'white';
            this.canv.strokeRect(this.childBuffer[i].x, this.childBuffer[i].y, this.childBuffer[i].w, this.childBuffer[i].h);
            this.canv.stroke();
            this.canv.closePath();
        }
    };
    TreemapTransition.prototype.clear = function () {
        this.canv.clearRect(0, 0, this.width, this.height);
    };
    TreemapTransition.prototype.animate = function () {
        if (this.effects === 'fade') {
            this.animation.fade(this.effectsDir);
        }
    };
    TreemapTransition.prototype.preAnimate = function () {
        var _this = this;
        this.self.style.opacity = 1;
        this.play = true;
        if (this.effects === 'fade') {
            setTimeout(function () {
                _this.stop();
            }, 150);
            if (this.effectsDir === 'in') {
                this.self.style.opacity = 1;
            }
            if (this.effectsDir === 'out') {
                this.self.style.opacity = 1;
            }
        }
    };
    TreemapTransition.prototype.render = function () {
        var _this = this;
        setTimeout(function () {
            if (_this.play) {
                _this.clear();
                _this.drawParentRects();
                _this.drawChildRects();
                _this.animate();
                _this.render();
            }
        }, this.renderTime);
    };
    TreemapTransition.prototype.start = function () {
        this.drawParentRects();
        this.drawChildRects();
        this.self.style.transition = 'opacity 0s';
        this.preAnimate();
        this.render();
    };
    TreemapTransition.prototype.stop = function () {
        this.self.style.transition = 'opacity .5s';
        this.self.style.opacity = 0;
        this.play = false;
    };
    TreemapTransition.prototype.setPlay = function (p) {
        this.play = p;
        this.render();
    };
    TreemapTransition.prototype.setEffect = function (effec, effecDir) {
        this.effects = effec;
        this.effectsDir = effecDir;
    };
    TreemapTransition.prototype.draw = function () {
        this.drawParentRects();
    };
    TreemapTransition.prototype.updateData = function (data) {
        this.updateBuffers(data);
        this.drawParentRects();
        this.drawChildRects();
    };
    TreemapTransition.prototype.updateBuffers = function (data) {
        this.buffer = data.parent;
        this.childBuffer = data.child;
    };
    TreemapTransition.prototype.init = function (id, w, h) {
        this.setDrawboard(id, w, h);
    };
    return TreemapTransition;
}());
// responsible for managing the treemap computation and display
var Treemap = /** @class */ (function () {
    function Treemap() {
        // internal properties
        // main variables
        this.container = {
            self: self,
            width: null,
            height: null,
            id: {
                self: null,
                main: null,
                transition: null,
                tips: null
            },
            data: null
        };
        this.offset = {
            "class": 'treemap-offset',
            x: 0,
            y: 0
        };
        this.mouse = {
            enable: true,
            click: {
                x: null,
                y: null
            },
            hover: {
                x: null,
                y: null
            }
        };
        // child objects dependencies
        this.main = new TreemapMain();
        this.transition = new TreemapTransition();
    }
    Treemap.prototype.setDrawboard = function (width, height, id) {
        var mainId = id + Math.ceil(Math.random() * 1000000), transitionId = id + Math.ceil(Math.random() * 1000000), mainCanv = document.createElement('canvas'), transitionCanv = document.createElement('canvas');
        mainCanv.setAttribute('id', mainId);
        mainCanv.setAttribute('width', width);
        mainCanv.setAttribute('height', height);
        mainCanv.setAttribute('style', 'position:absolute;');
        transitionCanv.setAttribute('id', transitionId);
        transitionCanv.setAttribute('width', width);
        transitionCanv.setAttribute('height', height);
        transitionCanv.setAttribute('style', 'position:absolute;');
        this.container.self = document.getElementById(id);
        this.container.self.appendChild(mainCanv);
        this.container.self.appendChild(transitionCanv);
        this.container.id.main = mainId;
        this.container.id.transition = transitionId;
    };
    Treemap.prototype.setStyle = function (el) {
        el.style.cursor = 'pointer';
        el.style.position = 'relative';
    };
    Treemap.prototype.setEvents = function (el, mainChild, transitionChild) {
        var _this = this;
        el.addEventListener('click', function (e) {
            if (_this.mouse.enable) {
                _this.mouse.click.x = e.clientX - _this.offset.x;
                _this.mouse.click.y = e.clientY - _this.offset.y;
                mainChild.setClickPos(_this.mouse.click.x, _this.mouse.click.y);
            }
        });
        el.addEventListener('mousemove', function (e) {
            if (_this.mouse.enable) {
                _this.mouse.hover.x = e.clientX - _this.offset.x;
                _this.mouse.hover.y = e.clientY - _this.offset.y;
                mainChild.setHoverPos(_this.mouse.hover.x, _this.mouse.hover.y);
            }
        });
        el.addEventListener('mouseover', function () {
            if (_this.mouse.enable) {
                mainChild.setPlay(true);
                mainChild.setClickPos(-5, -5);
            }
        });
        el.addEventListener('mouseout', function () {
            if (_this.mouse.enable) {
                mainChild.setPlay(false);
                mainChild.draw();
            }
        });
        window.onresize = function () {
            _this.setOffset();
        };
        window.onscroll = function () {
            _this.setOffset();
        };
    };
    Treemap.prototype.setOffset = function () {
        var offsetX = 0, offsetY = 0, parents = [];
        try {
            parents = document.getElementsByClassName(this.offset["class"]);
        }
        catch (err) {
            // console.log('no classname')
        }
        if (parents) {
            for (var i = 0; i < parents.length; i++) {
                offsetX += parents[i].offsetLeft;
                offsetY += parents[i].offsetTop;
            }
        }
        this.offset.x = offsetX - window.pageXOffset;
        this.offset.y = offsetY - window.pageYOffset;
    };
    Treemap.prototype.changeData = function (data, isEqual) {
        var _this = this;
        this.mouse.enable = false;
        setTimeout(function () {
            _this.mouse.enable = true;
        }, 100);
        this.transition.updateBuffers(this.main.getBuffers());
        this.transition.start();
        setTimeout(this.main.updateData(data, isEqual), 100);
    };
    Treemap.prototype.getClickIndex = function () {
        return this.main.getCLickIndex();
    };
    Treemap.prototype.setOffsetClass = function (className) {
        this.offset["class"] = className;
    };
    Treemap.prototype.init = function (id, width, height, data, isEqual) {
        this.container.width = width;
        this.container.height = height;
        this.container.id.self = id;
        this.container.data = data;
        this.setDrawboard(width, height, id);
        this.setStyle(this.container.self);
        this.main.init(this.container.id.main, width, height, data, isEqual);
        this.transition.init(this.container.id.transition, width, height);
        this.setEvents(this.container.self, this.main, this.transition);
        this.setOffset();
    };
    return Treemap;
}());
