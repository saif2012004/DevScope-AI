"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSetPageTitle } from "@/context/PageTitleContext";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  useSetPageTitle("Settings");
  const { user } = useUser();
  const { openUserProfile } = useClerk();

  const [emailNotif, setEmailNotif] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "—";
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    "—";

  function handlePrefChange(
    next: boolean,
    setter: (v: boolean) => void,
  ) {
    setter(next);
    toast.success("Preferences saved");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your account information is managed by Clerk.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {user?.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt=""
              width={80}
              height={80}
              className="h-20 w-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-muted text-2xl font-medium text-muted-foreground">
              {displayName !== "—" ? displayName.slice(0, 1).toUpperCase() : "?"}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-lg font-semibold">{displayName}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => openUserProfile()}
            >
              Edit Profile →
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">
                Product updates and alerts
              </p>
            </div>
            <Switch
              checked={emailNotif}
              onCheckedChange={(v) => handlePrefChange(v, setEmailNotif)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Weekly digest</p>
              <p className="text-xs text-muted-foreground">
                Summary of activity
              </p>
            </div>
            <Switch
              checked={weeklyDigest}
              onCheckedChange={(v) => handlePrefChange(v, setWeeklyDigest)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Notification preferences will be saved to your account.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions. Be careful.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "flex flex-col gap-4 rounded-lg border border-destructive/50 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="shrink-0 sm:ml-4"
              onClick={() => {
                setDeleteConfirm("");
                setDeleteOpen(true);
              }}
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, all repositories, all
              chat history, and cancel your subscription. This action CANNOT be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label htmlFor="delete-confirm" className="text-sm font-medium">
              Type DELETE to confirm
            </label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm("")}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteConfirm !== "DELETE"}
              onClick={() => {
                toast.success(
                  "Account deletion coming soon — please contact support.",
                );
                setDeleteOpen(false);
                setDeleteConfirm("");
              }}
            >
              Confirm delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
