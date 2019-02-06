@import "delegate.js";

var sketch = require("sketch"),
	pluginName = "Shared Style Finder",
	pluginIdentifier = "com.sonburn.sketchplugins.shared-style-finder",
	debugMode = false;

var layerStyles = getSharedStyles(0),
	textStyles = getSharedStyles(1),
	styles,
	styleNames,
	uiButtons = [];

var find = function(context) {
	if (!layerStyles.length && !textStyles.length) {
		displayDialog("This document has no shared styles.",pluginName);
		return;
	}

	var alertWidth = 380,
		contentFrameWidth = alertWidth,
		contentFrameGutter = 15,
		layerStyleWidth = contentFrameWidth - contentFrameGutter,
		layerStyleHeight = 96,
		layerStylesVisible = 4,
		settingPad = 10,
		settingY = 0;

	var alert = NSAlert.alloc().init(),
		alertIconPath = context.plugin.urlForResourceNamed("icon.png").path(),
		alertIcon = NSImage.alloc().initByReferencingFile(alertIconPath),
		alertContent = NSView.alloc().init();

	alert.setIcon(alertIcon);
	alert.setMessageText(pluginName);
	alert.setInformativeText("Find instances of a shared layer or text style.");

	alertContent.setFlipped(true);

	var styleType = createSegmentedControl(["Layer Styles","Text Styles"],NSMakeRect(0,settingY,alertWidth,24));

	styles = layerStyles;

	if (!textStyles.length) {
		styleType.setEnabled_forSegment(0,1);
		styleType.setSelected_forSegment(1,0);
	} else if (!layerStyles.length) {
		styleType.setEnabled_forSegment(0,0);
		styleType.setSelected_forSegment(1,1);

		styles = textStyles;
	} else {
		styleType.cell().setAction("callAction:");
		styleType.cell().setCOSJSTargetFunction(function(sender) {
			styles = (sender.indexOfSelectedItem() == 0) ? layerStyles : textStyles;
			styleNames = getStyleNames(styles);

			if (styleNames) {
				styleList.removeAllItems();
				styleList.addItemsWithObjectValues(styleNames);
				styleList.selectItemAtIndex(0);
			}
		});
	}

	styleNames = getStyleNames(styles);

	alertContent.addSubview(styleType);

	settingY = CGRectGetMaxY(alertContent.subviews().lastObject().frame()) + settingPad;

	var styleList = createSelect(styleNames,0,NSMakeRect(0,settingY,alertWidth,28));

	alertContent.addSubview(styleList);

	var styleListDelegate = new MochaJSDelegate({
		"comboBoxSelectionDidChange:" : (function() {
			if (styleList.indexOfSelectedItem() != -1) {
				var selectedItem = styleList.indexOfSelectedItem();

				var objectsWithStyleID = (sketch.version.sketch < 52) ? getObjectsWithStyleIDOld(styles[selectedItem].objectID()) : getObjectsWithStyleID(styles[selectedItem].objectID());

				var subviews = layerListContent.subviews();

				for (var i = subviews.length - 1; i >= 0; --i) {
					subviews[i].removeFromSuperview();
				}

				var layerListCount = 0;

				for (var i = 0; i < objectsWithStyleID.length; i++) {
					layerListContent.addSubview(createListItem(objectsWithStyleID[i],NSMakeRect(0,layerStyleHeight*layerListCount,layerStyleWidth,layerStyleHeight)));

					layerListCount++;
				}

				layerListContent.frame = NSMakeRect(0,0,layerStyleWidth,objectsWithStyleID.length*layerStyleHeight);

				matchCount.setStringValue("Matches: " + objectsWithStyleID.length);

				if (objectsWithStyleID.length == 0) {
					removeStyleButton.setEnabled(1);
				} else {
					removeStyleButton.setEnabled(0);
				}
			}
		})
	});

	styleList.setDelegate(styleListDelegate.getClassInstance());

	var objectsWithStyleID = (sketch.version.sketch < 52) ? getObjectsWithStyleIDOld(styles[0].objectID()) : getObjectsWithStyleID(styles[0].objectID());

	settingY = CGRectGetMaxY(alertContent.subviews().lastObject().frame()) + settingPad;

	var layerList = createScrollView(NSMakeRect(0,settingY,contentFrameWidth,layerStyleHeight * layerStylesVisible)),
		layerListContent = createContentView(NSMakeRect(0,0,layerStyleWidth,objectsWithStyleID.length*layerStyleHeight)),
		layerListCount = 0;

	for (var i = 0; i < objectsWithStyleID.length; i++) {
		layerListContent.addSubview(createListItem(objectsWithStyleID[i],NSMakeRect(0,layerStyleHeight*layerListCount,layerStyleWidth,layerStyleHeight)));

		layerListCount++;
	}

	layerList.setBackgroundColor(NSColor.whiteColor());
	layerList.setDocumentView(layerListContent);

	alertContent.addSubview(layerList);

	settingY = CGRectGetMaxY(alertContent.subviews().lastObject().frame()) + settingPad;

	var matchCount = createMatchText("Matches: " + objectsWithStyleID.length,NSMakeRect(0,settingY,alertWidth,18));
	alertContent.addSubview(matchCount);

	alertContent.frame = NSMakeRect(0,0,alertWidth,CGRectGetMaxY(matchCount.frame()));

	alert.accessoryView = alertContent;

	var closeButton = alert.addButtonWithTitle("Close");
	var removeStyleButton = alert.addButtonWithTitle("Remove Style");

	if (objectsWithStyleID.length == 0) {
		removeStyleButton.setEnabled(1);
	} else {
		removeStyleButton.setEnabled(0);
	}

	var alertResponse = alert.runModal();

	if (!debugMode) googleAnalytics(context,"find","run");

	if (alertResponse == 1000) {
		// Do something
	} else if (alertResponse == 1001) {
		var document = sketch.getSelectedDocument(),
			selectedItem = styleList.indexOfSelectedItem(),
			selectedStyle = styles[selectedItem],
			selectedStyleSource;

		if (document.getSharedLayerStyleWithID(selectedStyle.objectID())) {
			selectedStyle = document.getSharedLayerStyleWithID(selectedStyle.objectID());
			selectedStyleSource = MSDocument.currentDocument().documentData().layerStyles();
		} else {
			selectedStyle = document.getSharedTextStyleWithID(selectedStyle.objectID());
			selectedStyleSource = MSDocument.currentDocument().documentData().layerTextStyles();
		}

		if (!selectedStyle.getAllInstancesLayers().length) {
			if (selectedStyleSource.sharedStyleWithID) {
				selectedStyleSource.removeSharedStyle(selectedStyleSource.sharedStyleWithID(selectedStyle.id));
			} else {
				selectedStyleSource.removeSharedStyle(selectedStyle);
			}
		}

		NSApplication.sharedApplication().delegate().runPluginCommandWithIdentifier_fromBundleAtURL_context("find",context.command.pluginBundle().url(),context);
	} else return false;
}

var report = function(context) {
	openUrl("https://github.com/sonburn/shared-style-finder/issues/new");

	if (!debugMode) googleAnalytics(context,"report","report");
}

var plugins = function(context) {
	openUrl("https://sonburn.github.io/");

	if (!debugMode) googleAnalytics(context,"plugins","plugins");
}

var donate = function(context) {
	openUrl("https://www.paypal.me/sonburn");

	if (!debugMode) googleAnalytics(context,"donate","donate");
}

function createBoldLabel(text,size,frame) {
	var label = NSTextField.alloc().initWithFrame(frame);

	label.setStringValue(text);
	label.setFont(NSFont.boldSystemFontOfSize(size));
	label.setBezeled(0);
	label.setDrawsBackground(0);
	label.setEditable(0);
	label.setSelectable(0);

	return label;
}

function createCheckbox(item,state,frame) {
	var checkbox = NSButton.alloc().initWithFrame(frame),
		state = (state == false) ? NSOffState : NSOnState;

	checkbox.setButtonType(NSSwitchButton);
	checkbox.setBezelStyle(0);
	checkbox.setTitle(item.name);
	checkbox.setTag(item.value);
	checkbox.setState(state);

	return checkbox;
}

function createContentView(frame) {
	var view = NSView.alloc().initWithFrame(frame);

	view.setFlipped(1);

	return view;
}

function createDivider(frame) {
	var divider = NSView.alloc().initWithFrame(frame);

	divider.setWantsLayer(1);
	divider.layer().setBackgroundColor(CGColorCreateGenericRGB(204/255,204/255,204/255,1.0));

	return divider;
}

function createField(string,frame) {
	var textField = NSTextField.alloc().initWithFrame(frame);

	textField.setStringValue(string);
	textField.setFont(NSFont.systemFontOfSize(11));
	textField.setTextColor(NSColor.blackColor());
	textField.setBezeled(0);
	textField.setEditable(0);
	textField.setDrawsBackground(0);
	textField.setLineBreakMode(NSLineBreakByTruncatingTail);

	return textField;
}

function createMatchText(string,frame) {
	var textField = NSTextField.alloc().initWithFrame(frame),
		textColor = (isUsingDarkTheme()) ? NSColor.lightGrayColor() : NSColor.darkGrayColor();

	textField.setStringValue(string);
	textField.setFont(NSFont.systemFontOfSize(11));
	textField.setTextColor(textColor);
	textField.setBezeled(0);
	textField.setEditable(0);
	textField.setDrawsBackground(0);

	return textField;
}

function createImageArea(instance,frame) {
	var imageArea = NSButton.alloc().initWithFrame(frame);

	imageArea.setTitle("");
	imageArea.setBordered(0);
	imageArea.setWantsLayer(1);
	imageArea.layer().setBackgroundColor(CGColorCreateGenericRGB(248/255,248/255,248/255,1.0));

	var exportRequest = MSExportRequest.exportRequestsFromExportableLayer_inRect_useIDForName_(
		instance,
		instance.absoluteInfluenceRect(),
		false
		).firstObject();

	exportRequest.format = "png";

	var scaleX = (frame.size.width-4*2) / exportRequest.rect().size.width;
	var scaleY = (frame.size.height-4*2) / exportRequest.rect().size.height;

	exportRequest.scale = (scaleX < scaleY) ? scaleX : scaleY;

	var colorSpace = NSColorSpace.sRGBColorSpace(),
		exporter = MSExporter.exporterForRequest_colorSpace_(exportRequest,colorSpace),
		imageRep = exporter.bitmapImageRep(),
		instanceImage = NSImage.alloc().init().autorelease();

	instanceImage.addRepresentation(imageRep);

	imageArea.setImage(instanceImage);

	return imageArea;
}

function createLabel(string,frame) {
	var textLabel = NSTextField.alloc().initWithFrame(frame);

	textLabel.setStringValue(string);
	textLabel.setFont(NSFont.systemFontOfSize(9));
	textLabel.setTextColor(NSColor.lightGrayColor());
	textLabel.setBezeled(0);
	textLabel.setEditable(0);
	textLabel.setBackgroundColor(NSColor.whiteColor());

	return textLabel;
}

function createListItem(instance,frame) {
	var listItem = NSView.alloc().initWithFrame(frame),
		rightColWidth = 140,
		leftColWidth = frame.size.width-rightColWidth,
		leftPad = 8;

	listItem.setFlipped(1);
	listItem.addSubview(createLabel("Page",NSMakeRect(leftPad,6,leftColWidth,14)));
	listItem.addSubview(createField(instance.parentPage().name(),NSMakeRect(leftPad,18,leftColWidth-leftPad,18)));
	listItem.addSubview(createLabel("Artboard",NSMakeRect(leftPad,34,leftColWidth,14)));
	listItem.addSubview(createField((instance.parentArtboard()) ? instance.parentArtboard().name() : "None",NSMakeRect(leftPad,46,leftColWidth-leftPad,18)));
	listItem.addSubview(createLabel("Instance",NSMakeRect(leftPad,62,leftColWidth,14)));
	listItem.addSubview(createField(instance.name(),NSMakeRect(leftPad,74,leftColWidth-leftPad,18)));
	listItem.addSubview(createImageArea(instance,NSMakeRect(leftColWidth,0,rightColWidth,frame.size.height)));
	listItem.addSubview(createDivider(NSMakeRect(0,frame.size.height-1,frame.size.width,1)));
	listItem.addSubview(createTargetArea(instance,NSMakeRect(0,0,frame.size.width,frame.size.height)));

	return listItem;
}

function createScrollView(frame) {
	var view = NSScrollView.alloc().initWithFrame(frame);

	view.setHasVerticalScroller(1);

	return view;
}

function createSegmentedControl(items,frame) {
	var segControl = NSSegmentedControl.alloc().initWithFrame(frame);

	segControl.setSegmentCount(items.length);

	items.forEach(function(item,index) {
		segControl.setLabel_forSegment(item,index);
		segControl.setWidth_forSegment(0,index);
	});

	segControl.cell().setTrackingMode(0); //Raw value of NSSegmentSwitchTrackingSelectOne.
	segControl.setSelected_forSegment(1,0);

	return segControl;
}

function createSelect(items,selectedItemIndex,frame) {
	var comboBox = NSComboBox.alloc().initWithFrame(frame),
		selectedItemIndex = (selectedItemIndex > -1) ? selectedItemIndex : 0;

	comboBox.addItemsWithObjectValues(items);
	comboBox.selectItemAtIndex(selectedItemIndex);
	comboBox.setNumberOfVisibleItems(16);
	comboBox.setEditable(0);

	return comboBox;
}

function createTargetArea(instance,frame) {
	var targetArea = NSButton.alloc().initWithFrame(frame);

	uiButtons.push(targetArea);

	targetArea.addCursorRect_cursor(targetArea.frame(),NSCursor.pointingHandCursor());
	targetArea.setTransparent(1);
	targetArea.setAction("callAction:");
	targetArea.setCOSJSTargetFunction(function(sender) {
		for (var i = 0; i < uiButtons.length; i++) {
			if (uiButtons[i].layer()) uiButtons[i].layer().setBorderWidth(0);
		}

		sender.setWantsLayer(1);
		sender.layer().setBorderWidth(2);
		sender.layer().setBorderColor(CGColorCreateGenericRGB(0,0,1,1));

		var rect = (instance.parentArtboard()) ? instance.parentArtboard().rect() : instance.absoluteRect().rect();

		MSDocument.currentDocument().setCurrentPage(instance.parentPage());
		MSDocument.currentDocument().contentDrawView().zoomToFitRect(rect);

		instance.select_byExtendingSelection(1,0);
	});

	return targetArea;
}

function displayDialog(body,title) {
	var app = NSApplication.sharedApplication();
	app.displayDialog_withTitle(body,title);
}

function getObjectsWithStyleID(styleID) {
	var sketch = require("sketch"),
		document = sketch.getSelectedDocument(),
		style = (document.getSharedLayerStyleWithID(styleID)) ? document.getSharedLayerStyleWithID(styleID) : document.getSharedTextStyleWithID(styleID),
		styleInstances = style.getAllInstances();

	var objectsWithStyleID = NSMutableArray.array();

	styleInstances.forEach(function(style){
		objectsWithStyleID.addObject(style.getParentLayer().sketchObject);
	});

	return objectsWithStyleID;
}

function getObjectsWithStyleIDOld(styleID) {
	var objectsWithStyleID = NSMutableArray.array(),
		pageLoop = MSDocument.currentDocument().pages().objectEnumerator(),
		page;

	while (page = pageLoop.nextObject()) {
		var predicate = NSPredicate.predicateWithFormat("style.sharedObjectID == %@",styleID),
			layers = page.children().filteredArrayUsingPredicate(predicate),
			layerLoop = layers.objectEnumerator(),
			layer;

		while (layer = layerLoop.nextObject()) {
			objectsWithStyleID.addObject(layer);
		}
	}

	return objectsWithStyleID;
}

function getSharedStyles(type) {
	if (sketch.version.sketch < 52) {
		var styles = (type == 0) ? MSDocument.currentDocument().documentData().layerStyles().objects() : MSDocument.currentDocument().documentData().layerTextStyles().objects();
	} else {
		var styles = (type == 0) ? MSDocument.currentDocument().documentData().allLayerStyles() : MSDocument.currentDocument().documentData().allTextStyles();
	}

	var sortByName = NSSortDescriptor.sortDescriptorWithKey_ascending("name",1);
	styles = styles.sortedArrayUsingDescriptors([sortByName]);

	return styles;
}

function getStyleNames(source) {
	var styleNames = [];

	for (var i = 0; i < source.length; i++) {
		var styleLibrary = AppController.sharedInstance().librariesController().libraryForShareableObject(source[i]),
			styleName = (styleLibrary) ? source[i].name() + " [" + styleLibrary.name() + "]" : source[i].name();

		styleNames.push(String(styleName));
	}

	return styleNames;
}

function getUnusedStyles(type) {
	var usedStyleIDs = [],
		pageLoop = MSDocument.currentDocument().pages().objectEnumerator(),
		page;

	while (page = pageLoop.nextObject()) {
		var predicate = (type == 0) ? NSPredicate.predicateWithFormat("className != %@ && style.sharedObjectID != nil","MSTextLayer") : NSPredicate.predicateWithFormat("className == %@ && style.sharedObjectID != nil","MSTextLayer"),
			layers = page.children().filteredArrayUsingPredicate(predicate),
			layerLoop = layers.objectEnumerator(),
			layer;

			while (layer = layerLoop.nextObject()) {
				var styleID = String(layer.style().sharedObjectID());

				if (usedStyleIDs.indexOf(styleID) == -1) {
					usedStyleIDs.push(styleID);
				}
			}
	}

	var unusedStyles = NSMutableArray.array(),
		styles = (type == 0) ? MSDocument.currentDocument().documentData().layerStyles().objects() : MSDocument.currentDocument().documentData().layerTextStyles().objects(),
		styleLoop = styles.objectEnumerator(),
		style;

	while (style = styleLoop.nextObject()) {
		var styleID = String(style.objectID());

		if (usedStyleIDs.indexOf(styleID) == -1) {
			unusedStyles.addObject(style);
		}
	}

	var sortByName = NSSortDescriptor.sortDescriptorWithKey_ascending("name",1);

	return unusedStyles.sortedArrayUsingDescriptors([sortByName]);
}

function googleAnalytics(context,category,action,label,value) {
	var trackingID = "UA-118958211-1",
		uuidKey = "google.analytics.uuid",
		uuid = NSUserDefaults.standardUserDefaults().objectForKey(uuidKey);

	if (!uuid) {
		uuid = NSUUID.UUID().UUIDString();
		NSUserDefaults.standardUserDefaults().setObject_forKey(uuid,uuidKey);
	}

	var url = "https://www.google-analytics.com/collect?v=1";
	// Tracking ID
	url += "&tid=" + trackingID;
	// Source
	url += "&ds=sketch" + MSApplicationMetadata.metadata().appVersion;
	// Client ID
	url += "&cid=" + uuid;
	// pageview, screenview, event, transaction, item, social, exception, timing
	url += "&t=event";
	// App Name
	url += "&an=" + encodeURI(context.plugin.name());
	// App ID
	url += "&aid=" + context.plugin.identifier();
	// App Version
	url += "&av=" + context.plugin.version();
	// Event category
	url += "&ec=" + encodeURI(category);
	// Event action
	url += "&ea=" + encodeURI(action);
	// Event label
	if (label) {
		url += "&el=" + encodeURI(label);
	}
	// Event value
	if (value) {
		url += "&ev=" + encodeURI(value);
	}

	var session = NSURLSession.sharedSession(),
		task = session.dataTaskWithURL(NSURL.URLWithString(NSString.stringWithString(url)));

	task.resume();
}

function isUsingDarkTheme() {
	return (NSUserDefaults.standardUserDefaults().stringForKey("AppleInterfaceStyle") == "Dark") ? true : false;
}

function openUrl(url) {
	NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString(url));
}

function removeDuplicates(value,index,self) {
	return self.indexOf(value) === index;
}
