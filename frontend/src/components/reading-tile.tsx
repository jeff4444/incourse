import { BookOpen, FileText, Layers, MessageSquare, File } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Module, ModuleItem } from "@/lib/types/course";

function getIcon(type: string) {
  switch (type) {
    case 'File':
      return <FileText className="h-5 w-5" />;
    case 'Page':
      return <File className="h-5 w-5" />;
    case 'Discussion':
      return <MessageSquare className="h-5 w-5" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
}

function getIconBgColor(type: string) {
  switch (type) {
    case 'File':
      return "bg-blue-100 text-blue-600";
    case 'Page':
      return "bg-green-100 text-green-600";
    case 'Discussion':
      return "bg-purple-100 text-purple-600";
    default:
      return "bg-blue-100 text-blue-600";
  }
}

function getButtonText(type: string) {
  switch (type) {
    case 'File':
      return "Continue Reading";
    case 'Page':
      return "View Page";
    case 'Discussion':
      return "Join Discussion";
    default:
      return "Continue Reading";
  }
}

function getHref(type: string, courseID: string, lmsContentId: string) {
  switch (type) {
    case 'File':
      return `/courses/${courseID}/files/${lmsContentId}`;
    case 'Page':
      return `/courses/${courseID}/pages/${lmsContentId}`;
    case 'Discussion':
      return `/courses/${courseID}/discussion_topics/${lmsContentId}`;
    default:
      return `/courses/${courseID}/files/${lmsContentId}`;
  }
}

export function ReadingTile({ reading, courseID, module }: { reading: ModuleItem, courseID: string, module: Module }) {
  // Only render supported types
  if (!['File', 'Page', 'Discussion'].includes(reading.type)) {
    return null;
  }

  return (
    <div
      className="flex flex-row gap-2 justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
      key={reading.id}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center ">
          <div className="flex items-center gap-4">
            <div className={`rounded-full p-2 ${getIconBgColor(reading.type)}`}>
              {getIcon(reading.type)}
            </div>
            <div>
              <p className="font-medium">{reading.name}</p>
              <p className="text-sm text-muted-foreground">
                {reading.type} • {module.name}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        {/* <p className="text-sm text-muted-foreground mr-2">{reading.lastRead}</p> */}
        <Link href={getHref(reading.type, courseID, reading.lmsContentId || '')}>
          <Button size="sm">
            {getButtonText(reading.type)}
          </Button>
        </Link>
      </div>
    </div>
  );
}
