<%@ WebHandler Language="C#" Debug="true" Class="Handler" %>
using System;
using System.IO;
using System.Web;
using System.Text;
public class Handler : IHttpHandler {

	public bool IsReusable {
		get {
			return true;
		}
	}

	public void ProcessRequest (HttpContext context) {
		string name = context.Request["name"];
		string html = context.Request["html"]; 
		string code = context.Request["code"]; 
		/*
		<div style="display:none;">{{script}}</div>
		//string script = "<script type='text/javascript'>alert(1);</script>";
		string script = "<script type='text/javascript'>"
		//+	"(function(){"
		+	"	var param = location.search.substring(1);"
		+	"	var list = param.split('&');"
		+	"	var oList = {};"
		+	"	for(var i=0,len=list.length;i<len;i++){"
		+	"		var item = list[i].split('=');"
		+	"		oList[item[0]] = item[1];"
		+	"	}"
		+	"	if(oList['name']){"
		+	"		alert(oList['name']);"
		+	"	}"
		//+	"})();"
		+	"</script>";
		
		html = html.Replace("{{script}}",script);
		*/
		
		context.Response.Write(html);
		
		
	
/*	
		//string n = System.Web.HttpContext.Current.Request.Path;
		string dir = HttpContext.Current.Server.MapPath(context.Request.ApplicationPath);
		string path = dir  + name + "\\index.htm";
		if(!File.Exists(dir + name)){
		   File.Create(dir + name);
		}
		context.Response.Write(File.Exists(dir + name));
        if (!File.Exists(path))
        {
            //string createText = "Hello and Welcome" + Environment.NewLine;
            File.WriteAllText(path, html);
        }
		
        string readText = File.ReadAllText(path);		
		
		context.Response.Write(readText);
*/

	}
}